import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BULL_QUEUES } from '@agahiram/shared';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { MeiliService } from './meili.service';
import { SearchIndexProcessor } from './search.processor';
import { PostsModule } from '../posts/posts.module';
import { NotificationsModule } from '../notifications/notifications.module';

const searchProviders = [SearchService, MeiliService] as Array<
  typeof SearchService | typeof MeiliService | typeof SearchIndexProcessor
>;
if (process.env.RUN_IN_PROCESS_SEARCH_WORKER !== 'false') {
  searchProviders.push(SearchIndexProcessor);
}

@Module({
  imports: [
    forwardRef(() => PostsModule),
    NotificationsModule,
    BullModule.registerQueue({ name: BULL_QUEUES.SEARCH_INDEX }),
  ],
  controllers: [SearchController],
  providers: searchProviders,
  exports: [SearchService, MeiliService],
})
export class SearchModule {}
