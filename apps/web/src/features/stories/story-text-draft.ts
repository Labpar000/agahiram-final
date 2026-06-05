import type { StoryOverlayDocument } from '@agahiram/shared';

export type StoryTextDraft = {
  dataUrl: string;
  overlay?: StoryOverlayDocument;
};

export function parseStoryTextDraft(raw: string | null): StoryTextDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoryTextDraft>;
    if (typeof parsed.dataUrl !== 'string' || parsed.dataUrl.length === 0) return null;
    return {
      dataUrl: parsed.dataUrl,
      overlay: parsed.overlay,
    };
  } catch {
    return null;
  }
}
