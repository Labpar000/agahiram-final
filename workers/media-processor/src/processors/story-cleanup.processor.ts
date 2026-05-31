import { prisma } from '@agahiram/database';

/** Archive expired stories then remove live rows (Highlight uses StoryArchive). */
export async function processStoryCleanupJob() {
  const expired = await prisma.story.findMany({
    where: { expiresAt: { lt: new Date() } },
  });

  let archived = 0;
  for (const story of expired) {
    const user = await prisma.user.findUnique({
      where: { id: story.userId },
      select: { storyArchiveEnabled: true },
    });
    if (user?.storyArchiveEnabled !== false) {
      const existing = await prisma.storyArchive.findFirst({
        where: { originalStoryId: story.id },
      });
      if (!existing) {
        await prisma.storyArchive.create({
          data: {
            userId: story.userId,
            mediaUrl: story.mediaUrl,
            mediaKey: story.mediaKey,
            type: story.type,
            overlayJson: story.overlayJson ?? undefined,
            durationMs: story.durationMs,
            linkedPostId: story.linkedPostId,
            originalStoryId: story.id,
            sourceAudience: story.audience === 'CLOSE_FRIENDS' ? 'CLOSE_FRIENDS' : 'PUBLIC',
            altText: story.altText,
            hashtag: story.hashtag,
            cityId: story.cityId,
            hlsUrl: story.hlsUrl,
            thumbnailUrl: story.thumbnailUrl,
            createdAt: story.createdAt,
          },
        });
      }
      archived += 1;
    }
    await prisma.story.delete({ where: { id: story.id } });
  }

  console.log(`[cleanup] archived ${archived}, removed ${expired.length} expired stories`);
  return { archived, removed: expired.length };
}
