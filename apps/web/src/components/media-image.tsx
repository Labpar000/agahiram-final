'use client';

import Image, { type ImageProps } from 'next/image';
import { isPreOptimizedMediaUrl, toServedMediaUrl } from '@agahiram/shared';

type MediaImageProps = Omit<ImageProps, 'src'> & {
  src: string | null | undefined;
};

/** Next/Image wrapper: serves via /storage when public, skips re-encoding for worker variants. */
export function MediaImage({ src, unoptimized, ...props }: MediaImageProps) {
  if (!src) return null;
  const normalized = toServedMediaUrl(src) ?? src;
  const skipOptimize = unoptimized ?? isPreOptimizedMediaUrl(normalized);
  return <Image src={normalized} unoptimized={skipOptimize} {...props} />;
}
