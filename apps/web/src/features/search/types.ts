import type { PriceType } from '@agahiram/shared';

export interface Filters {
  categoryId?: string;
  categoryName?: string;
  cityId?: string;
  cityName?: string;
  provinceId?: string;
  provinceName?: string;
  neighborhoodId?: string;
  neighborhoodName?: string;
  minPrice?: number;
  maxPrice?: number;
  priceType?: PriceType;
  sortBy?: 'newest' | 'cheapest' | 'mostExpensive' | 'mostViewed' | 'nearest' | 'relevance';
  onlyImage?: boolean;
  onlyVideo?: boolean;
  onlyPromoted?: boolean;
  lat?: number;
  lng?: number;
  attributes?: Record<string, string>;
}
