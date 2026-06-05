import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { PushSubscribeInput } from '@agahiram/shared';
import { PrismaService } from '../prisma/prisma.service';

export type PushNotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'message'
  | 'incomingCall'
  | 'missedCall'
  | string;

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);
  private webpush: typeof import('web-push') | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const wp = await this.getWebPush();
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (wp && publicKey && privateKey) {
      const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@alooche.com';
      wp.setVapidDetails(subject, publicKey, privateKey);
      this.logger.log('VAPID details initialized');
    }
  }

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

  async shouldPush(userId: string, type: PushNotificationType): Promise<boolean> {
    if (type === 'incomingCall' || type === 'missedCall') return true;

    const prefs = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    if (!prefs) return true;

    const map: Record<string, boolean> = {
      like: prefs.likesPush,
      comment: prefs.commentsPush,
      follow: prefs.followsPush,
      message: prefs.messagesPush,
    };
    return map[type] ?? true;
  }

  buildPayload(
    type: PushNotificationType,
    payload: Record<string, unknown>,
  ): { title: string; body: string; url: string; type: string } {
    switch (type) {
      case 'like':
        return {
          title: 'لایک جدید',
          body: 'پست شما لایک شد',
          url: `/post/${payload.postId ?? ''}`,
          type,
        };
      case 'comment':
        return {
          title: 'نظر جدید',
          body: (payload.message as string) || 'کسی روی پست شما نظر گذاشت',
          url: `/post/${payload.postId ?? ''}`,
          type,
        };
      case 'follow':
        return {
          title: 'فالوور جدید',
          body: 'کسی شما را دنبال کرد',
          url: '/notifications',
          type,
        };
      case 'message':
        return {
          title: 'پیام جدید',
          body: (payload.preview as string) || 'پیام جدید دارید',
          url: `/messages/${payload.conversationId ?? ''}`,
          type,
        };
      case 'incomingCall':
        return {
          title: 'تماس ورودی',
          body: `${payload.initiatorName ?? 'کاربر'} در حال تماس است`,
          url: `/messages/${payload.conversationId ?? ''}`,
          type,
        };
      case 'missedCall':
        return {
          title: 'تماس از دست رفته',
          body: 'یک تماس از دست رفته دارید',
          url: `/messages/${payload.conversationId ?? ''}`,
          type,
        };
      default:
        return {
          title: 'آگهی‌گرام',
          body: 'اعلان جدید',
          url: '/notifications',
          type,
        };
    }
  }

  async sendToUser(
    userId: string,
    input: {
      title: string;
      body: string;
      url: string;
      type: string;
      extra?: Record<string, unknown>;
    },
  ) {
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (!subs.length) return;

    const webpush = await this.getWebPush();
    if (!webpush) return;

    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) return;

    const notification = JSON.stringify({
      title: input.title,
      body: input.body,
      url: input.url,
      type: input.type,
      ...input.extra,
    });

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush!.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            notification,
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription
              .delete({ where: { endpoint: sub.endpoint } })
              .catch(() => null);
          } else {
            this.logger.warn(`Push failed for ${sub.endpoint}: ${String(err)}`);
          }
        }
      }),
    );
  }

  async sendIncomingCall(
    userId: string,
    payload: { callId: string; conversationId: string; initiatorName: string },
  ) {
    const built = this.buildPayload('incomingCall', payload);
    await this.sendToUser(userId, {
      ...built,
      extra: { callId: payload.callId, conversationId: payload.conversationId },
    });
  }

  private async getWebPush() {
    if (this.webpush) return this.webpush;
    try {
      this.webpush = await import('web-push');
      return this.webpush;
    } catch {
      this.logger.warn('web-push not installed — skipping push notification');
      return null;
    }
  }
}
