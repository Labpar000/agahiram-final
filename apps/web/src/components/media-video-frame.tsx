'use client';

import { forwardRef, type VideoHTMLAttributes } from 'react';
import { cn } from '@agahiram/shared';

type MediaVideoFrameProps = VideoHTMLAttributes<HTMLVideoElement> & {
  fit?: 'cover' | 'contain';
  frameClassName?: string;
};

/** Shared video container — absolute fill, iOS-safe, consistent object-fit. */
export const MediaVideoFrame = forwardRef<HTMLVideoElement, MediaVideoFrameProps>(
  function MediaVideoFrame({ fit = 'cover', className, frameClassName, ...videoProps }, ref) {
    return (
      <div
        className={cn(
          'media-video-frame relative size-full min-h-0 overflow-hidden bg-black',
          fit === 'contain' && 'media-video-frame--contain',
          frameClassName,
        )}
      >
        <video
          ref={ref}
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
