/** Shared mobile layout style values — keep drawer/input shells consistent. */

export const drawerMaxHeightStyle = {
  maxHeight: 'min(85svh, calc(var(--vv-height, 100svh) - var(--safe-top)))',
} as const;

export const viewportHeightAboveChrome =
  'calc(min(100svh, var(--vv-height, 100svh)) - var(--header-height) - var(--bottom-nav) - var(--safe-bottom))';

export const mainViewportMinHeight = viewportHeightAboveChrome;

export const searchFiltersMaxHeightStyle = {
  maxHeight: 'calc(var(--vv-height, 100svh) - var(--header-height) - var(--safe-top))',
} as const;
