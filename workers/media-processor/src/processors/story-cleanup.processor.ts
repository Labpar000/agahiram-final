import { prisma } from '@agahiram/database';

export async function processStoryCleanupJob() {
  const result = await prisma.story.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log(`[cleanup] removed ${result.count} expired stories`);
  return result;
}
