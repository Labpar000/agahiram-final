import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
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
import { SearchModule } from '../search/search.module';
import { GiphyService } from '../integrations/giphy.service';
import { WeatherService } from '../integrations/weather.service';
import { getJwtSecret } from '../config/secrets';

@Module({
  imports: [
    JwtModule.register({ secret: getJwtSecret() }),
    MediaModule,
    MessagesModule,
    NotificationsModule,
    SearchModule,
    BullModule.registerQueue(
      { name: BULL_QUEUES.STORY_CLEANUP },
      { name: BULL_QUEUES.MEDIA_PROCESSING },
      { name: BULL_QUEUES.SEARCH_INDEX },
      { name: BULL_QUEUES.STORY_SCHEDULED },
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
