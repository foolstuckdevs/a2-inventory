export default function PageLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-64 animate-pulse rounded-md bg-muted" />
            <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="h-9 w-32 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="rounded-md border">
          <div className="h-10 border-b bg-muted/30" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-4 py-3">
              <div className="h-4 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
