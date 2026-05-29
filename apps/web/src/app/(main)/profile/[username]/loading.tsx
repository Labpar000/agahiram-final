export default function ProfileLoading() {
  return (
    <div className="space-y-4 px-4 py-5">
      <div className="flex items-start gap-4">
        <div className="size-20 animate-pulse rounded-full bg-muted" />
        <div className="grid flex-1 grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
      <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
      <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
      <div className="grid grid-cols-3 gap-1 pt-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="aspect-square animate-pulse bg-muted" />
        ))}
      </div>
    </div>
  );
}
