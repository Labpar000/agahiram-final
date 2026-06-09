import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '@agahiram/shared';
import { SettingsService } from '../../admin/settings.service';

export const SKIP_MAINTENANCE_KEY = 'skipMaintenance';

/**
 * Returns 503 for write requests when `maintenanceMode=true`, unless the request
 * is from an admin/moderator (who must still be able to disable maintenance).
 * GETs always pass so users can still browse cached content.
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly settings: SettingsService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_MAINTENANCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const method = req.method?.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;

    const s = this.settings.getCached();
    if (!s.maintenanceMode) return true;

    const user = (req as unknown as { user?: JwtPayload & { phone?: string } }).user;
    if (user && (user.role === 'admin' || user.role === 'moderator')) return true;

    throw new ServiceUnavailableException(
      s.maintenanceMessage ?? 'سایت در حالت تعمیر است؛ لطفاً بعداً مراجعه کنید.',
    );
  }
}
