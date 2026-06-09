import { describe, expect, it } from 'vitest';
import { PriceType } from '../types';
import {
  exploreSchema,
  searchAlertCreateSchema,
  searchSchema,
  searchSuggestionsSchema,
} from './search';

describe('search schemas', () => {
  it('accepts browse mode without q', () => {
    const result = searchSchema.parse({ limit: 24 });
    expect(result.q).toBeUndefined();
    expect(result.limit).toBe(24);
  });

  it('accepts text search with filters', () => {
    const result = searchSchema.parse({
      q: 'آیفون',
      categoryId: '550e8400-e29b-41d4-a716-446655440000',
      minPrice: 1000,
      onlyImage: 'true',
      sortBy: 'cheapest',
    });
    expect(result.q).toBe('آیفون');
    expect(result.onlyImage).toBe(true);
    expect(result.minPrice).toBe(1000);
  });

  it('parses attributes JSON from query string', () => {
    const result = searchSchema.parse({
      attributes: JSON.stringify({ brand: 'پژو', year: '1398' }),
    });
    expect(result.attributes).toEqual({ brand: 'پژو', year: '1398' });
  });

  it('accepts priceType filter', () => {
    const result = searchSchema.parse({ priceType: PriceType.NEGOTIABLE });
    expect(result.priceType).toBe(PriceType.NEGOTIABLE);
  });

  it('exploreSchema matches search without q', () => {
    expect(exploreSchema.parse({ cityId: '550e8400-e29b-41d4-a716-446655440001' }).cityId).toBe(
      '550e8400-e29b-41d4-a716-446655440001',
    );
  });

  it('validates suggestions input', () => {
    expect(searchSuggestionsSchema.parse({ q: 'te' }).limit).toBe(8);
  });

  it('requires alert criteria', () => {
    expect(() => searchAlertCreateSchema.parse({ filters: {} })).toThrow();
    expect(searchAlertCreateSchema.parse({ query: 'ماشین', filters: {} }).query).toBe('ماشین');
  });
});
