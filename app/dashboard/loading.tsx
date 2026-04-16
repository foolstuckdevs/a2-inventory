import { Card } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-36 animate-pulse rounded bg-muted" />
          </Card>
        ))}
      </div>
    </div>
  );
}
