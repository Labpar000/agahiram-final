export default function PostLoading() {
  return (
    <div className="bg-background">
      <div className="sticky top-[var(--header-height)] z-20 flex items-center gap-2 border-b border-border bg-background/95 px-3 py-2 backdrop-blur-md">
        <div className="size-9 animate-pulse rounded-full bg-muted" />
        <div className="h-4 w-24 animate-pulse rounded-full bg-muted" />
      </div>
      <article className="border-b border-border bg-surface">
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
        </div>
      </article>
    </div>
  );
}
