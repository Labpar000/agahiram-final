import { describe, expect, it } from 'vitest';
import { parseStoryTextDraft } from './story-text-draft';

describe('story text draft parsing', () => {
  it('parses a valid draft payload', () => {
    const draft = parseStoryTextDraft(
      JSON.stringify({
        dataUrl: 'data:image/jpeg;base64,AAAA',
        overlay: { layers: [{ type: 'text', text: 'hello', x: 0.5, y: 0.5 }] },
      }),
    );

    expect(draft?.dataUrl).toBe('data:image/jpeg;base64,AAAA');
    expect(draft?.overlay?.layers).toHaveLength(1);
  });

  it('returns null for missing raw draft', () => {
    expect(parseStoryTextDraft(null)).toBeNull();
  });

  it('returns null for invalid json draft', () => {
    expect(parseStoryTextDraft('{bad-json')).toBeNull();
  });

  it('returns null when draft is missing dataUrl', () => {
    expect(parseStoryTextDraft(JSON.stringify({ overlay: { layers: [] } }))).toBeNull();
  });
});
