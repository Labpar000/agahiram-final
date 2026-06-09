'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PostSummary } from '@agahiram/shared';
import {
  formatPersianCompact,
  formatPersianNumber,
  formatPersianPrice,
  getPostCoverMedia,
  isPreOptimizedMediaUrl,
  pickThumbnailSrc,
  toServedMediaUrl,
} from '@agahiram/shared';
import { IgEye, IgLayers, IgPlay } from '@agahiram/ui';
import { PostLink } from '@/components/post-link';

export function ExploreTile({ post }: { post: PostSummary }) {
  const media = getPostCoverMedia(post.media);
  const isVideo = media?.type === 'video';
  const thumbSrc = media ? pickThumbnailSrc(media) : null;
  const videoSrc = media?.url ? (toServedMediaUrl(media.url) ?? media.url) : null;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const [hovering, setHovering] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const onMouseEnter = useCallback(() => {
    if (!isVideo) return;
    setHovering(true);
    hoverTimerRef.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && v.readyState >= 2) {
        v.muted = true;
        v.playsInline = true;
        void v.play().catch(() => {});
      }
    }, 400);
  }, [isVideo]);

  const onMouseLeave = useCallback(() => {
    setHovering(false);
    setVideoReady(false);
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.removeAttribute('src');
      v.load();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  return (
    <PostLink
      postId={post.id}
      post={post}
      aria-label={`${post.title}، ${formatPersianPrice(post.price)}`}
      className="cv-tile group relative block aspect-square overflow-hidden bg-neutral-900 tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {media ? (
        <>
          {thumbSrc ? (
            <Image
              src={thumbSrc}
              alt=""
              fill
              sizes="(max-width: 640px) 33vw, 200px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized={isPreOptimizedMediaUrl(thumbSrc)}
              style={videoReady && isVideo ? { opacity: 0 } : undefined}
            />
          ) : null}
          {isVideo && videoSrc && hovering ? (
            <video
              ref={videoRef}
              src={videoSrc}
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 size-full object-cover"
              onCanPlay={() => setVideoReady(true)}
              onLoadedMetadata={() => setVideoReady(true)}
              style={{ pointerEvents: 'none' }}
            />
          ) : null}
        </>
      ) : (
        <div className="grid size-full place-items-center bg-neutral-800 p-2 text-center text-xs text-muted-foreground">
          بدون رسانه
        </div>
      )}
      {isVideo ? (
        <IgPlay
          className="absolute start-[6px] top-[6px] size-[18px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
          filled
          strokeWidth={1.75}
          aria-hidden
        />
      ) : null}
      {post.media.length > 1 ? (
        <span
          aria-hidden
          className="absolute end-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white"
        >
          <IgLayers className="size-3" strokeWidth={1.75} aria-hidden />
          {formatPersianNumber(post.media.length)}
        </span>
      ) : null}
      {post.viewCount > 0 ? (
        <span className="absolute bottom-1.5 end-1.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100">
          <IgEye className="size-3" strokeWidth={1.75} aria-hidden />
          {formatPersianCompact(post.viewCount)}
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-2 pt-6 opacity-100 transition-opacity duration-200 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
        <p className="line-clamp-1 text-[12px] font-bold text-white drop-shadow">{post.title}</p>
        <p className="truncate text-[11px] text-white/95 drop-shadow">
          {formatPersianPrice(post.price)}
        </p>
      </div>
    </PostLink>
  );
}
