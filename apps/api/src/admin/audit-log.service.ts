import { Injectable, Logger } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditContext {
  actorId: string;
  actorRole: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Best-effort write — never throws so a logging failure can't break the action. */
  async record(
    ctx: AuditContext,
    action: string,
    target?: string | null,
    payload?: Record<string, unknown> | null,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: ctx.actorId,
          actorRole: ctx.actorRole,
          action,
          target: target ?? null,
          payload: (payload ?? null) as never,
          ip: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        },
      });
    } catch (e) {
      this.logger.warn(`audit write failed: ${(e as Error).message}`);
    }
  }

  /**
   * Helper to extract context from a Fastify request bound to a JWT-authenticated
   * admin endpoint. Strip the X-Forwarded-For chain to a single trusted hop so we
   * don't store spoofable client-supplied values when behind a real proxy.
   */
  static fromRequest(req: FastifyRequest): AuditContext {
    const user = (req as unknown as { user?: JwtPayload }).user;
    const fwd = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    return {
      actorId: user?.sub ?? 'unknown',
      actorRole: user?.role ?? 'unknown',
      ip: fwd ?? req.ip ?? undefined,
      userAgent: (req.headers['user-agent'] as string | undefined) ?? undefined,
    };
  }

  async list(params: {
    page?: number;
    pageSize?: number;
    actorId?: string;
    action?: string;
    target?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(5, params.pageSize ?? 30));
    const where = {
      ...(params.actorId ? { actorId: params.actorId } : {}),
      ...(params.action ? { action: { contains: params.action } } : {}),
      ...(params.target ? { target: { contains: params.target } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const actorIds = Array.from(new Set(rows.map((r) => r.actorId)));
    const actors = await this.prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, username: true, name: true },
    });
    const byId = new Map(actors.map((a) => [a.id, a]));
    return {
      data: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        actor: byId.get(r.actorId) ?? null,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }
}
