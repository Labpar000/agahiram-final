import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { BULL_QUEUES } from '@agahiram/shared';
import { processImageJob } from './processors/image.processor';
import { processVideoJob } from './processors/video.processor';
import {
  processSearchIndexJob,
  processSearchIndexStoryJob,
} from './processors/search-index.processor';
import { processNotificationJob } from './processors/notification.processor';
import { processStoryCleanupJob } from './processors/story-cleanup.processor';
import { processStoryMediaJob } from './processors/story-media.processor';
import { processStoryScheduledJob } from './processors/story-scheduled.processor';

const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

console.log('[worker] starting media-processor...');

new Worker(
  BULL_QUEUES.MEDIA_PROCESSING,
  async (job) => {
    console.log(`[media] ${job.name} - ${job.id}`);
    if (job.name === 'transcode') return processVideoJob(job.data);
    if (job.name === 'thumbnail' || job.name === 'optimize') return processImageJob(job.data);
    if (job.name === 'story-media') return processStoryMediaJob(job.data);
  },
  { connection, concurrency: 2 },
);

new Worker(
  BULL_QUEUES.SEARCH_INDEX,
  async (job) => {
    console.log(`[search] ${job.name} - ${job.id}`);
    if (job.name === 'index-story') return processSearchIndexStoryJob(job.data);
    if (job.name === 'remove') {
      if (job.data.storyId) {
        return processSearchIndexStoryJob({ storyId: job.data.storyId, remove: true });
      }
      if (job.data.postId) {
        return processSearchIndexJob({ postId: job.data.postId, remove: true });
      }
      return;
    }
    if (job.name === 'index') return processSearchIndexJob(job.data);
    return processSearchIndexJob(job.data);
  },
  { connection, concurrency: 5 },
);

new Worker(
  BULL_QUEUES.STORY_SCHEDULED,
  async (job) => {
    console.log(`[story-scheduled] ${job.name} - ${job.id}`);
    if (job.name === 'publish') return processStoryScheduledJob(job.data);
  },
  { connection, concurrency: 2 },
);

new Worker(
  BULL_QUEUES.NOTIFICATIONS,
  async (job) => {
    console.log(`[notif] ${job.name} - ${job.id}`);
    return processNotificationJob(job.data);
  },
  { connection, concurrency: 5 },
);

new Worker(
  BULL_QUEUES.STORY_CLEANUP,
  async (job) => {
    console.log(`[cleanup] ${job.name}`);
    return processStoryCleanupJob();
  },
  { connection, concurrency: 1 },
);

console.log('[worker] all workers running');

process.on('SIGTERM', () => {
  console.log('[worker] shutting down...');
  connection.disconnect();
  process.exit(0);
});
