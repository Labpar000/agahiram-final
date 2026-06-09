import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BULL_QUEUES } from '@agahiram/shared';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PostSearchService } from './post-search.service';
import { SearchSuggestionsService } from './search-suggestions.service';
import { SearchAlertService } from './search-alert.service';
import { SearchIndexerService } from './search-indexer.service';
import { MeiliService } from './meili.service';
import { SearchIndexProcessor } from './search.processor';
import { SearchAlertProcessor } from './search-alert.processor';
import { PostsModule } from '../posts/posts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CategoriesModule } from '../categories/categories.module';

const searchProviders = [
  SearchService,
  PostSearchService,
  SearchSuggestionsService,
  SearchAlertService,
  SearchIndexerService,
  MeiliService,
] as Array<
  | typeof SearchService
  | typeof PostSearchService
  | typeof SearchSuggestionsService
  | typeof SearchAlertService
  | typeof SearchIndexerService
  | typeof MeiliService
  | typeof SearchIndexProcessor
  | typeof SearchAlertProcessor
>;
if (process.env.RUN_IN_PROCESS_SEARCH_WORKER !== 'false') {
  searchProviders.push(SearchIndexProcessor, SearchAlertProcessor);
}

@Module({
  imports: [
    forwardRef(() => PostsModule),
    NotificationsModule,
    CategoriesModule,
    BullModule.registerQueue(
      { name: BULL_QUEUES.SEARCH_INDEX },
      { name: BULL_QUEUES.SEARCH_ALERT_MATCH },
    ),
  ],
  controllers: [SearchController],
  providers: searchProviders,
  exports: [SearchService, MeiliService],
})
export class SearchModule {}
