import { Injectable } from '@nestjs/common';
import type { PushSubscribeInput } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(userId: string, input: PushSubscribeInput, userAgent?: string) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: userAgent ?? null,
      },
      update: {
        userId,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        userAgent: userAgent ?? null,
      },
    });
    return { subscribed: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return { unsubscribed: true };
  }

  vapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY ?? null };
  }
}
