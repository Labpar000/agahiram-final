'use client';

import Link from 'next/link';
import Image from 'next/image';
import { IgPlus, STORY_INNER, StoryTrayItem } from '@agahiram/ui';
import { cn } from '@agahiram/shared';

const linkClass =
  'group flex w-[4.625rem] shrink-0 flex-col items-center tap-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface';

/** IG "Your story" cell — ring opens viewer, + badge opens composer. */
export function YourStoryTrayCell({
  userId,
  hasStories,
  hasUnviewed,
  avatarUrl,
}: {
  userId: string;
  hasStories: boolean;
  hasUnviewed?: boolean;
  avatarUrl?: string | null;
  username?: string | null;
}) {
  const ringImage = avatarUrl ? (
    <Image
      src={avatarUrl}
      alt=""
      width={68}
      height={68}
      className={cn(STORY_INNER, 'rounded-full object-cover')}
    />
  ) : undefined;

  return (
    <div className="flex w-[4.625rem] shrink-0 flex-col items-center">
      <div className="relative">
        <Link
          href={hasStories ? `/stories/${userId}` : '/create/story'}
          aria-label={hasStories ? 'استوری شما' : 'افزودن استوری'}
          className={linkClass}
        >
          <StoryTrayItem
            variant={hasStories ? 'story' : 'add'}
            hasUnviewed={!!hasUnviewed}
            label={hasStories ? 'استوری شما' : 'شما'}
            labelClassName="hidden"
            ringImage={hasStories ? ringImage : undefined}
            className="transition-transform group-active:scale-95"
          />
        </Link>
        {hasStories ? (
          <Link
            href="/create/story"
            aria-label="افزودن استوری جدید"
            className="absolute -bottom-0.5 -end-0.5 z-10 grid size-6 place-items-center rounded-full border-2 border-surface bg-primary text-primary-foreground shadow-sm tap-none"
          >
            <IgPlus className="size-3.5" strokeWidth={2.5} aria-hidden />
          </Link>
        ) : null}
      </div>
      <span className="mt-1.5 w-full max-w-[66px] truncate text-center text-xs text-muted-foreground">
        {hasStories ? 'استوری شما' : 'شما'}
      </span>
    </div>
  );
}
