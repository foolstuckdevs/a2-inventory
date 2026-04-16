import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, ArrowLeftRight, AlertTriangle, HandCoins } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const [
    { count: itemCount },
    { count: transactionCount },
    { data: allItems },
    { data: borrowedTx },
  ] = await Promise.all([
    supabase.from("items").select("*", { count: "exact", head: true }),
    supabase.from("transactions").select("*", { count: "exact", head: true }),
    supabase.from("items").select("*, categories(*)"),
    supabase
      .from("transactions")
      .select("*")
      .eq("action", "borrowed"),
  ]);

  // Count currently borrowed (borrowed minus returned)
  const { count: returnedCount } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("action", "returned");

  const borrowedCount = (borrowedTx?.length ?? 0) - (returnedCount ?? 0);

  const lowStockItems = (allItems ?? []).filter(
    (i: Record<string, number>) => i.quantity <= i.reorder_level
  );

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
      value: transactionCount ?? 0,
      icon: ArrowLeftRight,
      description: "Total stock movements",
      href: "/dashboard/transactions",
    },
    {
      label: "Borrowed Items",
      value: Math.max(0, borrowedCount),
      icon: HandCoins,
      description: "Currently borrowed out",
      href: "/dashboard/transactions",
    },
    {
      label: "Low Stock",
      value: lowStockItems.length,
      icon: AlertTriangle,
      description: "Items below reorder level",
      href: "/dashboard/items",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your inventory system.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
