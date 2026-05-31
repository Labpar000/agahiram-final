import type { StoryOverlayDocument } from './story-overlay';

/** Extract plain text from overlay layers for search indexing (no AI). */
export function extractStorySearchableText(
  overlayJson: unknown,
  extras?: { altText?: string | null; hashtag?: string | null },
): string {
  const parts: string[] = [];
  if (extras?.altText?.trim()) parts.push(extras.altText.trim());
  if (extras?.hashtag?.trim()) parts.push(extras.hashtag.replace(/^#/, ''));

  if (overlayJson && typeof overlayJson === 'object' && !Array.isArray(overlayJson)) {
    const doc = overlayJson as StoryOverlayDocument & { _stickers?: unknown };
    for (const layer of doc.layers ?? []) {
      if (layer.type === 'text' && 'text' in layer && typeof layer.text === 'string') {
        parts.push(layer.text);
      }
    }
    const stickers = (doc as { _stickers?: Array<{ payload?: Record<string, unknown> }> })
      ._stickers;
    if (Array.isArray(stickers)) {
      for (const s of stickers) {
        const p = s.payload ?? {};
        for (const key of ['text', 'question', 'title', 'tag', 'username', 'label'] as const) {
          const v = p[key];
          if (typeof v === 'string' && v.trim()) parts.push(v.trim());
        }
      }
    }
  }

  return parts.join(' ').slice(0, 2000);
}

/** Merge user overlay layers with repost attribution (attribution stays on top). */
export function mergeStoryOverlays(
  userOverlay: unknown,
  attribution: StoryOverlayDocument,
): StoryOverlayDocument {
  const base =
    userOverlay && typeof userOverlay === 'object' && !Array.isArray(userOverlay)
      ? (userOverlay as StoryOverlayDocument)
      : { layers: [] };
  return {
    ...base,
    layers: [...(base.layers ?? []), ...(attribution.layers ?? [])],
  };
}

export function buildRepostAttributionOverlay(
  username: string,
  sourceLabel: string,
): StoryOverlayDocument {
  return {
    layers: [
      {
        type: 'text',
        text: `@${username}`,
        x: 0.5,
        y: 0.88,
        color: '#ffffff',
        align: 'center',
        font: 'bold',
      },
      {
        type: 'text',
        text: sourceLabel,
        x: 0.5,
        y: 0.92,
        color: '#ffffff',
        align: 'center',
        font: 'modern',
      },
    ],
  };
}
