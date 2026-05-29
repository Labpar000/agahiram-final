export default function FeedLoading() {
  return (
    <div className="bg-background">
      <div className="flex gap-3 overflow-hidden px-3 py-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="size-16 shrink-0 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      {[0, 1].map((i) => (
        <article
          key={i}
          className="border-b border-border bg-surface sm:my-3 sm:overflow-hidden sm:rounded-2xl sm:border sm:shadow-card"
        >
          <header className="flex items-center gap-3 p-3">
            <div className="size-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
            </div>
          </header>
          <div className="aspect-square w-full animate-pulse bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-2/3 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded-full bg-muted" />
            <div className="mt-3 h-11 w-full animate-pulse rounded-xl bg-muted" />
          </div>
        </article>
      ))}
    </div>
  );
}
