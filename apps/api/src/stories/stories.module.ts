import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BULL_QUEUES } from '@agahiram/shared';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { HighlightsService } from './highlights.service';
import { StoryArchiveService } from './story-archive.service';
import { CloseFriendsService } from './close-friends.service';
import { StoryStickersService } from './story-stickers.service';
import { StoriesInsightsService } from './stories-insights.service';
import { StoriesGateway } from './stories.gateway';
import { MediaModule } from '../media/media.module';
import { MessagesModule } from '../messages/messages.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GiphyService } from '../integrations/giphy.service';
import { WeatherService } from '../integrations/weather.service';

@Module({
  imports: [
    MediaModule,
    MessagesModule,
    NotificationsModule,
    BullModule.registerQueue(
      { name: BULL_QUEUES.STORY_CLEANUP },
      { name: BULL_QUEUES.MEDIA_PROCESSING },
    ),
  ],
  controllers: [StoriesController],
  providers: [
    StoriesService,
    HighlightsService,
    StoryArchiveService,
    CloseFriendsService,
    StoryStickersService,
    StoriesInsightsService,
    StoriesGateway,
    GiphyService,
    WeatherService,
  ],
  exports: [StoriesService, HighlightsService, StoryArchiveService, StoriesGateway],
})
export class StoriesModule {}
