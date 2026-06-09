import { describe, expect, it } from 'vitest';
import {
  computeVisualViewportVars,
  isKeyboardOpen,
  KEYBOARD_OPEN_THRESHOLD_PX,
} from './use-visual-viewport';

describe('computeVisualViewportVars', () => {
  it('returns fallback vars when visualViewport is unavailable', () => {
    expect(computeVisualViewportVars(800, null)).toEqual({
      vvHeight: '800px',
      vvOffsetTop: '0px',
      keyboardInset: '0px',
      keyboardInsetPx: 0,
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
      keyboardInsetPx: 250,
    });
  });
});

describe('isKeyboardOpen', () => {
  it('returns true when inset exceeds threshold', () => {
    expect(isKeyboardOpen(KEYBOARD_OPEN_THRESHOLD_PX + 1, false)).toBe(true);
  });

  it('returns true when an input is focused even with low inset', () => {
    expect(isKeyboardOpen(0, true)).toBe(true);
  });

  it('returns false when inset is low and no focused input', () => {
    expect(isKeyboardOpen(0, false)).toBe(false);
    expect(isKeyboardOpen(KEYBOARD_OPEN_THRESHOLD_PX, false)).toBe(false);
  });
});
