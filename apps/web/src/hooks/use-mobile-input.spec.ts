import { describe, expect, it } from 'vitest';
import { computeInputScrollOverflow, computeVisibleBottomFromMetrics } from './use-mobile-input';

describe('computeVisibleBottomFromMetrics', () => {
  it('uses visualViewport metrics when available', () => {
    expect(
      computeVisibleBottomFromMetrics({
        visualViewport: { height: 500, offsetTop: 50 },
        innerHeight: 800,
        keyboardInset: 250,
        keyboardOpen: true,
        bottomNav: 51,
        safeBottom: 34,
      }),
    ).toBe(550);
  });

  it('falls back to innerHeight minus chrome when visualViewport is missing', () => {
    expect(
      computeVisibleBottomFromMetrics({
        visualViewport: null,
        innerHeight: 800,
        keyboardInset: 250,
        keyboardOpen: false,
        bottomNav: 51,
        safeBottom: 34,
      }),
    ).toBe(465);
  });

  it('ignores bottom nav height when keyboard is open', () => {
    expect(
      computeVisibleBottomFromMetrics({
        visualViewport: null,
        innerHeight: 800,
        keyboardInset: 250,
        keyboardOpen: true,
        bottomNav: 51,
        safeBottom: 34,
      }),
    ).toBe(516);
  });
});

describe('computeInputScrollOverflow', () => {
  it('returns positive overflow when input sits below the visible area', () => {
    expect(computeInputScrollOverflow(560, 550)).toBe(18);
  });

  it('returns zero or negative overflow when input is already visible', () => {
    expect(computeInputScrollOverflow(540, 550)).toBeLessThanOrEqual(0);
  });
});
