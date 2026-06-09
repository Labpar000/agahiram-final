import { describe, expect, it } from 'vitest';
import { computeVisualViewportVars } from './use-visual-viewport';

describe('computeVisualViewportVars', () => {
  it('returns fallback vars when visualViewport is unavailable', () => {
    expect(computeVisualViewportVars(800, null)).toEqual({
      vvHeight: '800px',
      vvOffsetTop: '0px',
      keyboardInset: '0px',
    });
  });

  it('computes keyboard inset from visualViewport metrics', () => {
    expect(
      computeVisualViewportVars(800, {
        height: 500,
        offsetTop: 50,
      }),
    ).toEqual({
      vvHeight: '500px',
      vvOffsetTop: '50px',
      keyboardInset: '250px',
    });
  });
});
