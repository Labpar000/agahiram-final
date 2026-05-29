import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BULL_QUEUES } from '@agahiram/shared';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { FeedService } from './feed.service';
import { MediaModule } from '../media/media.module';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [
    MediaModule,
    CategoriesModule,
    BullModule.registerQueue(
      { name: BULL_QUEUES.SEARCH_INDEX },
      { name: BULL_QUEUES.MEDIA_PROCESSING },
      { name: BULL_QUEUES.NOTIFICATIONS },
    ),
  ],
  controllers: [PostsController],
  providers: [PostsService, FeedService],
  exports: [PostsService, FeedService],
})
export class PostsModule {}
