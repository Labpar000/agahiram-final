'use client';

import Link from 'next/link';
import { IconButton, IgArrowBack, LoadingState } from '@agahiram/ui';
import { StoryDiscoverRings, type DiscoverGroup } from './story-discover-rings';

export function StoryDiscoverPage({
  backHref = '/feed',
  heading,
  loading,
  groups,
  title,
  subtitle,
}: {
  backHref?: string;
  heading: string;
  loading: boolean;
  groups: DiscoverGroup[];
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-background p-4">
      <div className="mb-4 flex items-center gap-2">
        <Link href={backHref}>
          <IconButton
            aria-label="بازگشت"
            icon={<IgArrowBack className="size-5 rtl:rotate-180" strokeWidth={1.75} aria-hidden />}
            variant="ghost"
          />
        </Link>
        <h1 className="text-sm font-semibold">{heading}</h1>
      </div>
      {loading ? (
        <LoadingState />
      ) : (
        <StoryDiscoverRings groups={groups} title={title} subtitle={subtitle} />
      )}
    </div>
  );
}
