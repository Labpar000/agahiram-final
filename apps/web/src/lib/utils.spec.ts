import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatPersianNumber, formatPrice, formatRelativeTime } from './utils';

describe('web formatters', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-05T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats null or zero price as negotiable', () => {
    expect(formatPrice(null)).toBe('توافقی');
    expect(formatPrice(0)).toBe('توافقی');
  });

  it('formats positive prices in Persian locale', () => {
    expect(formatPrice(1_500_000)).toContain('تومان');
    expect(formatPrice(1_500_000)).toMatch(/۱|1/);
  });

  it('formats relative time for recent dates', () => {
    const fiveMinutesAgo = new Date('2026-06-05T11:55:00.000Z').toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 دقیقه پیش');
  });

  it('formats Persian numbers', () => {
    const formatted = formatPersianNumber(1234);
    expect(formatted).toMatch(/۱|1/);
    expect(formatted).toMatch(/۲|2/);
  });
});
