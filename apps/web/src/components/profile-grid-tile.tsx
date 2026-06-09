'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PostSummary } from '@agahiram/shared';
import {
  cn,
  formatPersianCompact,
  formatPersianNumber,
  formatPersianPrice,
  getPostCoverMedia,
  isPreOptimizedMediaUrl,
  pickThumbnailSrc,
  toServedMediaUrl,
} from '@agahiram/shared';
import { IgEye, IgLayers, IgPlay, IgReels } from '@agahiram/ui';
import { PostLink } from '@/components/post-link';
import { AdStatusBadge } from '@/components/ad-status-badge';
import { isReelPost } from '@/lib/reel-url';

type ProfileGridTab = 'posts' | 'reels' | 'saved';

export function ProfileGridTile({
  post,
  tab,
  showStatus,
}: {
  post: PostSummary;
  tab: ProfileGridTab;
  showStatus?: boolean;
}) {
  const media = getPostCoverMedia(post.media);
  const isReel = isReelPost(post) || tab === 'reels';
  const isVideo = media?.type === 'video' || isReel;
  const thumbSrc = media ? pickThumbnailSrc(media) : null;
  const videoSrc = media?.url ? (toServedMediaUrl(media.url) ?? media.url) : null;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const [videoReady, setVideoReady] = useState(false);

  const showMetaOverlay = tab !== 'reels';

  const onMouseEnter = useCallback(() => {
    if (!isVideo || !videoRef.current) return;
    hoverTimerRef.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && v.readyState >= 2) {
        v.muted = true;
        v.playsInline = true;
        void v.play().catch(() => {});
      }
    }, 280);
  }, [isVideo]);

  const onMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    const v = videoRef.current;
    if (v) {
      v.pause();
      v.currentTime = 0;
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
      preferReels={tab === 'reels'}
      aria-label={`${post.title}${showMetaOverlay ? `، ${formatPersianPrice(post.price)}` : ''}`}
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
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              unoptimized={isPreOptimizedMediaUrl(thumbSrc)}
              style={videoReady && isVideo ? { opacity: 0 } : undefined}
            />
          ) : isVideo ? (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-900 to-black" />
          ) : (
            <div className="grid size-full place-items-center bg-neutral-800 p-2 text-center text-[11px] text-white/60">
              بدون رسانه
            </div>
          )}
          {isVideo && videoSrc ? (
            <video
              ref={videoRef}
              src={videoSrc}
              muted
              playsInline
              preload="metadata"
              poster={thumbSrc ?? undefined}
              className="absolute inset-0 size-full object-cover"
              onCanPlay={() => setVideoReady(true)}
              onLoadedMetadata={() => setVideoReady(true)}
              style={{ pointerEvents: 'none' }}
            />
          ) : null}
        </>
      ) : (
        <div className="grid size-full place-items-center bg-neutral-800 p-2 text-center text-[11px] text-white/60">
          بدون رسانه
        </div>
      )}

      {showStatus && tab === 'posts' ? (
        <span className="absolute start-1 top-1 z-20">
          <AdStatusBadge status={post.status} />
        </span>
      ) : null}

      {isReel ? (
        <span className="absolute end-1.5 top-1.5 z-10 inline-flex items-center drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]">
          <IgReels className="size-[18px] text-white" filled aria-hidden />
        </span>
      ) : isVideo ? (
        <IgPlay
          className="absolute start-1.5 top-1.5 z-10 size-[18px] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]"
          filled
          strokeWidth={1.75}
          aria-hidden
        />
      ) : null}

      {tab !== 'reels' && post.media.length > 1 ? (
        <span
          aria-hidden
          className={cn(
            'absolute z-10 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-[2px]',
            isReel || isVideo ? 'end-1.5 bottom-1.5' : 'end-1.5 top-1.5',
          )}
        >
          <IgLayers className="size-3" strokeWidth={1.75} aria-hidden />
          {formatPersianNumber(post.media.length)}
        </span>
      ) : null}

      {tab === 'reels' && post.viewCount > 0 ? (
        <span className="absolute bottom-1.5 start-1.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          <IgEye className="size-3" strokeWidth={1.75} aria-hidden />
          {formatPersianCompact(post.viewCount)}
        </span>
      ) : null}

      {showMetaOverlay ? (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 pt-7 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
          <p className="line-clamp-1 text-[11px] font-bold leading-tight text-white drop-shadow-sm">
            {post.title}
          </p>
          <p className="truncate text-[10px] font-medium text-white/90 drop-shadow-sm">
            {formatPersianPrice(post.price)}
          </p>
        </div>
      ) : null}
    </PostLink>
  );
}
