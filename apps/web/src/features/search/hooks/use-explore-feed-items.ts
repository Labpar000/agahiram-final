import { useMemo } from 'react';
import { AdSlot } from '@agahiram/shared';
import type { Filters } from '../types';
import { useAdsConfig, useServedAds } from '@/hooks/use-ads';
import { mergeFeedWithAds } from '@/lib/merge-feed-with-ads';
import type { PostSummary } from '@agahiram/shared';

export function useExploreFeedItems(posts: PostSummary[], filters: Filters) {
  const { data: adsConfig } = useAdsConfig();
  const { data: exploreAds = [] } = useServedAds(AdSlot.EXPLORE_FEED, {
    cityId: filters.cityId,
    categoryId: filters.categoryId,
    limit: 5,
    enabled: !!adsConfig?.adsEnabled,
  });

  const feedItems = useMemo(
    () => mergeFeedWithAds(posts, exploreAds, adsConfig?.adsExploreInterval ?? 9),
    [posts, exploreAds, adsConfig?.adsExploreInterval],
  );

  return feedItems;
}
