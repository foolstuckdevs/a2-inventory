import { Suspense } from "react";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, ArrowLeftRight, AlertTriangle, HandCoins, ShieldAlert, PackageX, PackageMinus, Trash2 } from "lucide-react";

function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
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
  );
}

async function DashboardStats() {
  const supabase = await createServerSupabaseClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    { count: itemCount },
    { count: todayTransactionCount },
    { data: allItems },
    { data: borrowedTx },
    { count: returnedCount },
  ] = await Promise.all([
    supabase.from("items").select("*", { count: "exact", head: true }),
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString()),
    supabase.from("items").select("*, categories(*)"),
    supabase.from("transactions").select("*").eq("action", "borrowed"),
    supabase.from("transactions").select("*", { count: "exact", head: true }).eq("action", "returned"),
  ]);

  const borrowedCount = (borrowedTx?.length ?? 0) - (returnedCount ?? 0);

  const lowStockItems = (allItems ?? []).filter(
    (i: Record<string, number>) => i.quantity > 0 && i.quantity <= i.reorder_level
  );

  const damagedCount = (allItems ?? []).filter(
    (i: Record<string, string>) => i.status === "damaged"
  ).length;

  const lostCount = (allItems ?? []).filter(
    (i: Record<string, string>) => i.status === "lost"
  ).length;

  const outOfStockCount = (allItems ?? []).filter(
    (i: Record<string, number>) => i.quantity === 0
  ).length;

  const disposedCount = (allItems ?? []).filter(
    (i: Record<string, string>) => i.status === "disposed"
  ).length;

  const stats = [
    {
      label: "Total Items",
      value: itemCount ?? 0,
      icon: Package,
      description: "Items in your inventory",
      href: "/dashboard/items",
    },
    {
      label: "Transactions",
      value: todayTransactionCount ?? 0,
      icon: ArrowLeftRight,
      description: "Stock movements today",
      href: "/dashboard/transactions?date=today",
    },
    {
      label: "Borrowed Items",
      value: Math.max(0, borrowedCount),
      icon: HandCoins,
      description: "Currently borrowed out",
      href: "/dashboard/transactions?action=borrowed",
    },
    {
      label: "Low Stock",
      value: lowStockItems.length,
      icon: AlertTriangle,
      description: "Items below reorder level",
      href: "/dashboard/items?status=low_stock",
    },
    {
      label: "Damaged Items",
      value: damagedCount,
      icon: ShieldAlert,
      description: "Items marked as damaged",
      href: "/dashboard/items?status=damaged",
    },
    {
      label: "Lost Items",
      value: lostCount,
      icon: PackageX,
      description: "Items marked as lost",
      href: "/dashboard/items?status=lost",
    },
    {
      label: "Out of Stock",
      value: outOfStockCount,
      icon: PackageMinus,
      description: "Items with zero quantity",
      href: "/dashboard/items?status=out_of_stock",
    },
    {
      label: "Disposed Items",
      value: disposedCount,
      icon: Trash2,
      description: "Items marked as disposed",
      href: "/dashboard/items?status=disposed",
    },
  ];

  return (
    <>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-shadow hover:shadow-md cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <div className="rounded-lg bg-muted p-2">
                  <s.icon className="h-4 w-4 text-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{s.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reorder Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockItems.map((item: Record<string, unknown>) => (
                  <TableRow key={item.id as string}>
                    <TableCell className="font-medium">{item.name as string}</TableCell>
                    <TableCell>
                      {(item.categories as Record<string, string>)?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{item.quantity as number}</Badge>
                    </TableCell>
                    <TableCell>{item.reorder_level as number}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your inventory system.</p>
      </div>

      <Suspense fallback={<StatsGridSkeleton />}>
        <DashboardStats />
      </Suspense>
    </div>
  );
}
