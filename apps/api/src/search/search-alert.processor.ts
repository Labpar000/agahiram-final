import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BULL_QUEUES } from '@agahiram/shared';
import { SearchService } from './search.service';

@Processor(BULL_QUEUES.SEARCH_ALERT_MATCH)
export class SearchAlertProcessor extends WorkerHost {
  constructor(private readonly searchService: SearchService) {
    super();
  }

  async process(job: Job<{ postId: string }>) {
    if (job.name === 'match' && job.data.postId) {
      await this.searchService.processAlertMatches(job.data.postId);
    }
  }
}
