import { Skeleton } from '@agahiram/ui';

export default function PostLoading() {
  return (
    <div className="bg-background" aria-hidden>
      <div className="glass sticky top-[var(--header-height)] z-[var(--z-raised)] flex items-center gap-2 border-b border-border-subtle px-3 py-2">
        <Skeleton className="size-9 rounded-full" shimmer={false} />
        <Skeleton className="h-4 w-24 rounded-full" shimmer={false} />
      </div>
      <Skeleton className="aspect-square w-full rounded-none" shimmer={false} />
      <div className="space-y-3 px-4 py-4">
        <Skeleton className="h-5 w-2/3 rounded-full" shimmer={false} />
        <Skeleton className="h-4 w-full rounded-full" shimmer={false} />
        <Skeleton className="h-4 w-4/5 rounded-full" shimmer={false} />
        <Skeleton className="h-10 w-full rounded-lg" shimmer={false} />
      </div>
    </div>
  );
}
