export default function MessagesLoading() {
  return (
    <div className="bg-background">
      <div className="sticky top-[var(--header-height)] z-20 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-md">
        <div className="h-6 w-24 animate-pulse rounded-md bg-muted" />
      </div>
      <ul className="divide-y divide-border bg-surface">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
