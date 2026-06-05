import { prisma } from '@agahiram/database';

export async function processStoryScheduledJob(data: { sessionId: string }) {
  try {
    const now = new Date();
    const sess = await prisma.storyPublishSession.findUnique({
      where: { id: data.sessionId },
      select: { id: true, publishedAt: true, scheduledAt: true },
    });
    if (!sess || sess.publishedAt) return;
    if (sess.scheduledAt && sess.scheduledAt.getTime() > now.getTime()) return;

    await prisma.storyPublishSession.update({
      where: { id: sess.id },
      data: { publishedAt: now },
    });
  } catch (e) {
    console.error('[story-scheduled] publish failed', e);
  }
}
