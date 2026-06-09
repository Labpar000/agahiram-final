import { Injectable } from '@nestjs/common';
import {
  normalizePersianText,
  type ExploreInput,
  type SearchInput,
  type SearchSuggestionsInput,
  type SearchAlertCreateInput,
} from '@agahiram/shared';
import { PostSearchService } from './post-search.service';
import { SearchSuggestionsService } from './search-suggestions.service';
import { SearchAlertService } from './search-alert.service';
import { SearchIndexerService } from './search-indexer.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly postSearch: PostSearchService,
    private readonly suggestionService: SearchSuggestionsService,
    private readonly alerts: SearchAlertService,
    private readonly indexer: SearchIndexerService,
  ) {}

  async search(input: SearchInput, viewerId?: string) {
    const q = input.q?.trim();
    if (!q) {
      const posts = await this.postSearch.browsePosts(input, viewerId);
      return { posts, users: [], categories: [] };
    }

    const normalizedQ = normalizePersianText(q);
    const effectiveQ = normalizedQ || q;
    const [posts, users, categories] = await Promise.all([
      this.postSearch.searchPosts(input, viewerId),
      this.suggestionService.searchUsers(q, effectiveQ),
      this.suggestionService.searchCategories(q, effectiveQ),
    ]);

    if (posts.data.length === 0) {
      this.postSearch.logZeroResults(q, input);
    }

    return { posts, users, categories };
  }

  async browsePosts(input: ExploreInput | SearchInput, viewerId?: string) {
    return this.postSearch.browsePosts(input, viewerId);
  }

  async suggestions(input: SearchSuggestionsInput) {
    return this.suggestionService.suggestions(input);
  }

  async listAlerts(userId: string) {
    return this.alerts.listAlerts(userId);
  }

  async createAlert(userId: string, input: SearchAlertCreateInput) {
    return this.alerts.createAlert(userId, input);
  }

  async deactivateAlert(userId: string, alertId: string) {
    return this.alerts.deactivateAlert(userId, alertId);
  }

  async indexPost(postId: string) {
    return this.indexer.indexPost(postId);
  }

  async processAlertMatches(postId: string) {
    return this.alerts.processAlertMatches(postId);
  }

  async indexStory(storyId: string) {
    return this.indexer.indexStory(storyId);
  }

  async indexUser(userId: string) {
    return this.indexer.indexUser(userId);
  }

  async deletePost(postId: string) {
    return this.indexer.deletePost(postId);
  }

  async deleteStory(storyId: string) {
    return this.indexer.deleteStory(storyId);
  }

  async searchStoriesMeili(q: string, limit = 50) {
    return this.indexer.searchStoriesMeili(q, limit);
  }
}
