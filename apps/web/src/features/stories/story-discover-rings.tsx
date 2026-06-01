'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@agahiram/shared';

export interface DiscoverGroup {
  userId: string;
  user: { id: string; username: string | null; avatar: string | null };
  stories: Array<{
    id: string;
    mediaUrl: string;
    thumbnailUrl?: string | null;
    type: string;
  }>;
  hasUnviewed?: boolean;
}

export function StoryDiscoverRings({
  groups,
  title,
  subtitle,
}: {
  groups: DiscoverGroup[];
  title: string;
  subtitle?: string;
}) {
  if (!groups.length) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        استوری فعالی برای نمایش نیست.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-bold">{title}</h1>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      <ul className="mt-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {groups.map((g) => (
          <li key={g.userId}>
            <Link
              href={`/stories/${g.userId}`}
              className="flex w-[4.625rem] shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  'grid size-[4.625rem] place-items-center rounded-full p-[2px]',
                  g.hasUnviewed !== false
                    ? 'gradient-story'
                    : 'ring-2 ring-story-ring-viewed ring-offset-2 ring-offset-surface',
                )}
              >
                <span className="grid size-full place-items-center rounded-full bg-surface p-[2px]">
                  {(() => {
                    const thumb =
                      g.stories[g.stories.length - 1]?.thumbnailUrl ??
                      g.stories[g.stories.length - 1]?.mediaUrl;
                    return thumb ? (
                      <Image
                        src={thumb}
                        alt=""
                        width={68}
                        height={68}
                        className="size-full rounded-full object-cover"
                      />
                    ) : g.user.avatar ? (
                      <Image
                        src={g.user.avatar}
                        alt=""
                        width={68}
                        height={68}
                        className="size-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">
                        {(g.user.username ?? '?').slice(0, 2)}
                      </span>
                    );
                  })()}
                </span>
              </span>
              <span className="w-full max-w-[66px] truncate text-center text-xs">
                {g.user.username}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
