import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BULL_QUEUES } from '@agahiram/shared';
import { SearchService } from './search.service';

@Processor(BULL_QUEUES.SEARCH_INDEX)
export class SearchIndexProcessor extends WorkerHost {
  constructor(private readonly searchService: SearchService) {
    super();
  }

  async process(
    job: Job<{ postId?: string; storyId?: string; userId?: string; remove?: boolean }>,
  ) {
    if (job.name === 'index-user' && job.data.userId) {
      await this.searchService.indexUser(job.data.userId);
      return;
    }
    if (job.name === 'index-story') {
      if (job.data.remove && job.data.storyId) {
        await this.searchService.deleteStory(job.data.storyId);
      } else if (job.data.storyId) {
        await this.searchService.indexStory(job.data.storyId);
      }
      return;
    }
    if (job.name === 'remove') {
      if (job.data.storyId) {
        await this.searchService.deleteStory(job.data.storyId);
      } else if (job.data.postId) {
        await this.searchService.deletePost(job.data.postId);
      }
      return;
    }
    if (job.name === 'index' && job.data.postId) {
      if (job.data.remove) {
        await this.searchService.deletePost(job.data.postId);
      } else {
        await this.searchService.indexPost(job.data.postId);
      }
    }
  }
}
