import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtPayload, UserRole } from '@agahiram/shared';
import { isAdminPhone } from '../config/admin-phones';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('دسترسی مجاز نیست');
    }

    // Elevated endpoints are additionally gated by the admin phone allowlist, so
    // a stale/elevated role in the DB can never reach admin/moderator routes.
    const needsElevated = requiredRoles.some((r) => r === 'admin' || r === 'moderator');
    if (needsElevated && !isAdminPhone(user.phone)) {
      throw new ForbiddenException('دسترسی مجاز نیست');
    }
    return true;
  }
}
