export type PostMediaLike = {
  url: string;
  thumbnailUrl?: string | null;
  type?: string;
  order?: number;
  isThumbnail?: boolean;
};

/** Returns the user-selected cover/thumbnail media, or the first item by order. */
export function getPostCoverMedia<T extends PostMediaLike>(
  media: T[] | undefined | null,
): T | undefined {
  if (!media?.length) return undefined;
  const flagged = media.find((m) => m.isThumbnail);
  if (flagged) return flagged;
  return [...media].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0];
}
