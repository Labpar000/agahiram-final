import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BULL_QUEUES } from '@agahiram/shared';
import { CallsService } from './calls.service';

@Processor(BULL_QUEUES.CALL_TIMEOUT)
export class CallTimeoutProcessor extends WorkerHost {
  constructor(private readonly callsService: CallsService) {
    super();
  }

  async process(job: Job<{ callId: string }>) {
    await this.callsService.markMissed(job.data.callId);
  }
}
