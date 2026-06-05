import { Skeleton } from '@agahiram/ui';

export default function NotificationsLoading() {
  return (
    <div className="bg-background" aria-hidden>
      <div className="border-b border-border-subtle px-4 py-3">
        <Skeleton className="mx-auto h-5 w-20 rounded-full" shimmer={false} />
        <div className="mt-3 flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-14 shrink-0 rounded-full" shimmer={false} />
          ))}
        </div>
      </div>
      <ul className="divide-y divide-border bg-surface">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-11 shrink-0 rounded-full" shimmer={false} />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-3/4 rounded-full" shimmer={false} />
              <Skeleton className="h-3 w-24 rounded-full" shimmer={false} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
