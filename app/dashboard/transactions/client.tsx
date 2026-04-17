"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Plus, Eye } from "lucide-react";
import { createTransaction } from "@/lib/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { formatShortDateTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Item, TransactionWithDetails } from "@/lib/types";

const actionLabels: Record<string, string> = {
  stock_in: "Stock In",
  stock_out: "Stock Out",
  borrowed: "Borrowed",
  returned: "Returned",
  damaged: "Damaged",
  lost: "Lost",
  disposed: "Disposed",
  stock_return: "Stock Return",
};

const actionDescriptions: Record<string, string> = {
  stock_in: "New inventory added or quantities replenished",
  stock_out: "Item removed from inventory for immediate use",
  borrowed: "Item checked out for temporary use",
  returned: "Item successfully returned to the inventory",
  damaged: "Reported as broken, defective, or unusable",
  lost: "Reported as missing or cannot be located",
  disposed: "Permanently removed from stock (expired or scrapped)",
  stock_return: "Unused items added back into available stock",
};

const actionColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  stock_in: "default",
  stock_out: "destructive",
  borrowed: "secondary",
  returned: "outline",
  damaged: "secondary",
  lost: "destructive",
  disposed: "outline",
  stock_return: "default",
};

export function TransactionsClient({
  transactions,
  items,
}: {
  transactions: TransactionWithDetails[];
  items: Item[];
}) {
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [viewTx, setViewTx] = useState<TransactionWithDetails | null>(null);
  const [actionFilter, setActionFilter] = useState<string>(searchParams.get("action") ?? "all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Date range filter
  const todayStr = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState<string>(searchParams.get("date") === "today" ? todayStr : "");
  const [dateTo, setDateTo] = useState<string>(searchParams.get("date") === "today" ? todayStr : "");

  const selectedItem = items.find((i) => i.id === selectedItemId);
  const consumableOnly = ["stock_in", "stock_out", "stock_return", "disposed"];
  const nonConsumableOnly = ["stock_in", "borrowed", "returned", "damaged", "lost", "disposed"];
  const allActions = Object.keys(actionLabels);
  const availableActions = selectedItem
    ? selectedItem.type === "consumable"
      ? allActions.filter((a) => consumableOnly.includes(a))
      : allActions.filter((a) => nonConsumableOnly.includes(a))
    : allActions;

  const uniqueUsers = Array.from(
    new Map(transactions.filter((t) => t.profiles?.full_name).map((t) => [t.profiles!.full_name, t.user_id])).entries()
  );

  const hasFilters = actionFilter !== "all" || userFilter !== "all" || dateFrom !== "" || dateTo !== "";

  const filteredData = transactions.filter((t) => {
    if (actionFilter !== "all" && t.action !== actionFilter) return false;
    if (userFilter !== "all" && t.user_id !== userFilter) return false;
    if (dateFrom && new Date(t.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(t.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  });

  const columns: ColumnDef<TransactionWithDetails>[] = [
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Date <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs tabular-nums">
          {formatShortDateTime(row.getValue("created_at") as string)}
        </span>
      ),
    },
    {
      id: "item",
      accessorFn: (row) => row.items?.name ?? "",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Item <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.items?.name ?? "\u2014"}</span>,
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const action = row.getValue("action") as string;
        return <Badge variant={actionColors[action]}>{actionLabels[action]}</Badge>;
      },
    },
    {
      accessorKey: "quantity",
      header: "Qty",
      cell: ({ row }) => <span className="tabular-nums">{row.getValue("quantity")}</span>,
    },
    {
      id: "user",
      accessorFn: (row) => row.profiles?.full_name ?? "",
      header: "User",
      cell: ({ row }) => row.original.profiles?.full_name ?? "\u2014",
      meta: { mobileHidden: true, mobileLabel: "User" },
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ row }) => (
        <span className="max-w-45 truncate block text-muted-foreground text-xs">
          {(row.getValue("remarks") as string) || "\u2014"}
        </span>
      ),
      meta: { mobileHidden: true, mobileLabel: "Remarks" },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewTx(row.original)}>
            <Eye className="h-3.5 w-3.5" />
            <span className="sr-only">View details</span>
          </Button>
        </div>
      ),
      meta: { mobileHidden: true, mobileLabel: "Actions" },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-sm text-muted-foreground">Audit log of all stock movements.</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredData}
        searchKey="item"
        searchPlaceholder="Search items..."
        filterComponent={
          <>
            <NativeSelect
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 w-30"
            >
              <option value="all">All Actions</option>
              {Object.entries(actionLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="h-9 w-30"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map(([name, id]) => (
                <option key={id} value={id!}>{name}</option>
              ))}
            </NativeSelect>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">From</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); if (dateTo && e.target.value > dateTo) setDateTo(e.target.value); }}
                max={todayStr}
                className="h-9 w-36"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">To</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                min={dateFrom || undefined}
                max={todayStr}
                className="h-9 w-36"
              />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setActionFilter("all"); setUserFilter("all"); setDateFrom(""); setDateTo(""); }}>
                Clear filters
              </Button>
            )}
          </>
        }
        actionComponent={
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Transaction
          </Button>
        }
      />

      {/* New Transaction Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setSelectedItemId(""); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>Record a stock movement.</DialogDescription>
          </DialogHeader>
          <form
            action={async (fd) => {
              if (submitting) return;
              setSubmitting(true);
              setError("");
              try {
                await createTransaction(fd);
                setShowForm(false);
                setSelectedItemId("");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to record transaction.");
              } finally {
                setSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Item <span className="text-destructive">*</span></Label>
              <SearchableSelect
                name="item_id"
                required
                placeholder="Search items..."
                options={items.map((i) => ({ value: i.id, label: `${i.name} (Qty: ${i.quantity})` }))}
                onValueChange={(value) => setSelectedItemId(value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Action <span className="text-destructive">*</span></Label>
              <div className="grid gap-1.5 max-h-48 overflow-y-auto rounded-md border p-1">
                {availableActions.map((key) => (
                  <label
                    key={key}
                    className="flex items-start gap-2 rounded-md px-3 py-2 cursor-pointer hover:bg-muted has-checked:bg-muted has-checked:ring-1 has-checked:ring-ring transition-colors"
                  >
                    <input type="radio" name="action" value={key} required className="mt-0.5 accent-current" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-tight">{actionLabels[key]}</div>
                      <div className="text-xs text-muted-foreground leading-tight">{actionDescriptions[key]}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantity <span className="text-destructive">*</span></Label>
              <Input name="quantity" type="number" min={1} defaultValue={1} placeholder="1" />
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea name="remarks" placeholder="Optional notes about this transaction" rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>{submitting ? "Recording..." : "Record Transaction"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Transaction Details Dialog */}
      <Dialog open={!!viewTx} onOpenChange={(open) => { if (!open) setViewTx(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewTx?.items?.name ?? "Transaction"}
              {viewTx && <Badge variant={actionColors[viewTx.action]}>{actionLabels[viewTx.action]}</Badge>}
            </DialogTitle>
            <DialogDescription>Transaction details</DialogDescription>
          </DialogHeader>
          {viewTx && (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">General</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground text-xs">Date & Time</span><p className="font-medium">{formatShortDateTime(viewTx.created_at)}</p></div>
                  <div><span className="text-muted-foreground text-xs">Quantity</span><p className="font-medium">{viewTx.quantity}</p></div>
                </div>
              </div>
              <hr className="border-border" />
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><span className="text-muted-foreground text-xs">Performed By</span><p className="font-medium">{viewTx.profiles?.full_name ?? "\u2014"}</p></div>
                  <div><span className="text-muted-foreground text-xs">Item</span><p className="font-medium">{viewTx.items?.name ?? "\u2014"}</p></div>
                </div>
              </div>
              {viewTx.remarks && (
                <>
                  <hr className="border-border" />
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Remarks</h4>
                    <p className="font-medium">{viewTx.remarks}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
