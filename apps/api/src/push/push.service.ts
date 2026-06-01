import { Injectable, Logger } from '@nestjs/common';
import type { PushSubscribeInput } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

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

  async sendIncomingCall(
    userId: string,
    payload: { callId: string; conversationId: string; initiatorName: string },
  ) {
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;

    let webpush: typeof import('web-push') | null = null;
    try {
      webpush = await import('web-push');
    } catch {
      this.logger.warn('web-push not installed — skipping push notification');
      return;
    }

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@alooche.com';
    if (!publicKey || !privateKey) return;

    webpush.setVapidDetails(subject, publicKey, privateKey);

    const notification = JSON.stringify({
      title: 'تماس ورودی',
      body: `${payload.initiatorName} در حال تماس است`,
      url: `/messages/${payload.conversationId}`,
      type: 'incoming_call',
      callId: payload.callId,
      conversationId: payload.conversationId,
    });

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush!.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            notification,
          );
        } catch (err) {
          this.logger.warn(`Push failed for ${sub.endpoint}: ${String(err)}`);
        }
      }),
    );
  }
}
