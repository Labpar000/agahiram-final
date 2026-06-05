import { describe, expect, it } from 'vitest';
import { createCollectionSchema, updateCollectionSchema } from './collection';

describe('collection schemas', () => {
  it('accepts valid collection names', () => {
    expect(createCollectionSchema.parse({ name: 'ذخیره‌ها' }).name).toBe('ذخیره‌ها');
  });

  it('rejects empty collection names', () => {
    expect(() => createCollectionSchema.parse({ name: '' })).toThrow();
    expect(() => updateCollectionSchema.parse({ name: '' })).toThrow();
  });

  it('rejects names longer than 80 characters', () => {
    expect(() => createCollectionSchema.parse({ name: 'a'.repeat(81) })).toThrow();
  });
});
