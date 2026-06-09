'use client';

import { Skeleton } from '@agahiram/ui';

export function AdDetailSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
