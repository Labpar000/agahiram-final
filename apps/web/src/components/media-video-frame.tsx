'use client';

// FIXED: Always sets playsInline at element level (Safari iOS requirement).
// Applies iPad-sized safe-area padding for proper framing on tablets.
import { forwardRef, useEffect, useRef, type VideoHTMLAttributes } from 'react';
import { cn } from '@agahiram/shared';
import { applySafariVideoAttrs } from '@/lib/video-playback';

type MediaVideoFrameProps = VideoHTMLAttributes<HTMLVideoElement> & {
  fit?: 'cover' | 'contain';
  frameClassName?: string;
};

/** Shared video container — absolute fill, iOS-safe, consistent object-fit. */
export const MediaVideoFrame = forwardRef<HTMLVideoElement, MediaVideoFrameProps>(
  function MediaVideoFrame({ fit = 'cover', className, frameClassName, ...videoProps }, ref) {
    const innerRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
      const el = innerRef.current ?? (ref as React.RefObject<HTMLVideoElement>)?.current;
      if (el) applySafariVideoAttrs(el);
    }, [ref]);

    const setRefs = (node: HTMLVideoElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLVideoElement | null>).current = node;
      if (node) applySafariVideoAttrs(node);
    };

    return (
      <div
        className={cn(
          'media-video-frame relative size-full min-h-0 overflow-hidden bg-black',
          fit === 'contain' && 'media-video-frame--contain',
          frameClassName,
        )}
      >
        <video
          ref={setRefs}
          playsInline
          className={cn(
            'absolute inset-0 size-full object-cover object-center',
            fit === 'contain' && 'object-contain',
            className,
          )}
          {...videoProps}
        />
      </div>
    );
  },
);
