import type { StoryStickerType } from '@prisma/client';

export type StickerRow = {
  id: string;
  type: StoryStickerType | string;
  payload: unknown;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

/** Hide quiz answers from non-owners (feed, discover, user story ring). */
export function redactStickerPayload(
  type: string,
  payload: unknown,
  viewerIsOwner: boolean,
): Record<string, unknown> {
  const p =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : {};
  if (!viewerIsOwner && type === 'QUIZ' && 'correctIndex' in p) {
    delete p.correctIndex;
  }
  return p;
}

export function serializeStickersForViewer(
  stickers: StickerRow[],
  viewerId: string | undefined,
  ownerId: string,
) {
  const viewerIsOwner = !!viewerId && viewerId === ownerId;
  return stickers.map((s) => ({
    id: s.id,
    type: s.type,
    payload: redactStickerPayload(String(s.type), s.payload, viewerIsOwner),
    x: s.x,
    y: s.y,
    scale: s.scale,
    rotation: s.rotation,
  }));
}
