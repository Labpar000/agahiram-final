import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type AdAuditAction =
  | 'CAMPAIGN_CREATED'
  | 'CAMPAIGN_UPDATED'
  | 'CAMPAIGN_DELETED'
  | 'AD_CREATED'
  | 'AD_UPDATED'
  | 'AD_DELETED'
  | 'AD_REVIEWED';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    actor: { sub: string; role?: string };
    action: AdAuditAction;
    target: string | null;
    payload?: Record<string, unknown>;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: params.actor.sub,
        actorRole: params.actor.role ?? 'admin',
        action: params.action,
        target: params.target,
        payload: (params.payload as any) ?? undefined,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }
}
