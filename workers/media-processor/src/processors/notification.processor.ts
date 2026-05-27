import { prisma } from '@agahiram/database';

interface Job {
  userId: string;
  type: string;
  payload: Record<string, unknown>;
}

export async function processNotificationJob({ userId, type, payload }: Job) {
  await prisma.notification.create({
    data: { userId, type: type as any, payload: payload as any },
  });
}
