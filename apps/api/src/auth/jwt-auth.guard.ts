import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '@agahiram/shared';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<FastifyRequest & { isPublic?: boolean }>();
    request.isPublic = !!isPublic;
    return super.canActivate(context);
  }

  handleRequest<TUser = JwtPayload | null>(
    err: Error | null,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const request = context.switchToHttp().getRequest<FastifyRequest & { isPublic?: boolean }>();
    if (request.isPublic) return (user ?? null) as TUser;
    if (err || !user) throw err ?? new UnauthorizedException();
    return user;
  }
}
