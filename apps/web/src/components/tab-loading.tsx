import { Skeleton } from '@agahiram/ui';

/** Minimal IG-style shell while RSC loads — client Query cache shows content immediately. */
export function TabLoadingPlaceholder() {
  return (
    <div className="bg-background" aria-hidden>
      <div className="flex gap-3 overflow-hidden px-3 py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="size-[4.625rem] shrink-0 rounded-full" shimmer={false} />
        ))}
      </div>
      <div className="space-y-0">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="aspect-square w-full rounded-none" shimmer={false} />
            <div className="flex gap-3 px-3 py-2">
              <Skeleton className="size-6 rounded-full" shimmer={false} />
              <Skeleton className="h-4 flex-1 rounded" shimmer={false} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
