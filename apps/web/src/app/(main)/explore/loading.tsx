export default function ExploreLoading() {
  return (
    <div className="bg-background">
      <div className="sticky top-[var(--header-height)] z-20 border-b border-border bg-background/95 px-3 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <div className="h-11 flex-1 animate-pulse rounded-xl bg-muted" />
          <div className="size-11 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 p-1 sm:gap-1.5 sm:p-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse bg-muted" />
        ))}
      </div>
    </div>
  );
}
