export default function FeedLoading() {
  return (
    <div className="bg-background">
      <div className="flex gap-4 overflow-hidden px-4 py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="size-[4.125rem] shrink-0 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      {[0, 1].map((i) => (
        <article key={i} className="border-b border-border bg-surface">
          <header className="flex items-center gap-3 px-3 py-2.5">
            <div className="size-8 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
              <div className="h-2.5 w-16 animate-pulse rounded-full bg-muted" />
            </div>
          </header>
          <div className="aspect-square w-full animate-pulse bg-muted" />
          <div className="space-y-2 px-3 py-3">
            <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
            <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </article>
      ))}
    </div>
  );
}
