import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BULL_QUEUES } from '@agahiram/shared';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { HighlightsService } from './highlights.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule, BullModule.registerQueue({ name: BULL_QUEUES.STORY_CLEANUP })],
  controllers: [StoriesController],
  providers: [StoriesService, HighlightsService],
  exports: [StoriesService, HighlightsService],
})
export class StoriesModule {}
