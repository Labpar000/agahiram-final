import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BULL_QUEUES } from '@agahiram/shared';
import { SearchService } from './search.service';

@Processor(BULL_QUEUES.SEARCH_INDEX)
export class SearchIndexProcessor extends WorkerHost {
  constructor(private readonly searchService: SearchService) {
    super();
  }

  async process(job: Job<{ postId: string }>) {
    if (job.name === 'index') {
      await this.searchService.indexPost(job.data.postId);
    }
  }
}
