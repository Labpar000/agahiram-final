import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@agahiram/shared';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  },
);
