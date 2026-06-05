import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { FastifyRequest } from 'fastify';
import type { JwtPayload } from '@agahiram/shared';
import { getJwtSecret } from '../config/secrets';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: FastifyRequest) => {
          const cookies = req.cookies as Record<string, string> | undefined;
          return cookies?.accessToken ?? null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const cacheKey = `user:status:${payload.sub}`;
    let bannedFlag = await this.redis.get(cacheKey);
    if (bannedFlag === null) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { isBanned: true },
      });
      bannedFlag = user?.isBanned ? '1' : '0';
      await this.redis.set(cacheKey, bannedFlag, 30);
    }
    if (bannedFlag === '1') throw new UnauthorizedException('حساب شما مسدود شده است');
    return payload;
  }
}
