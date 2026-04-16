"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Plus, Eye } from "lucide-react";
import { createTransaction } from "@/lib/actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
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
};

const actionColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  stock_in: "default",
  stock_out: "destructive",
  borrowed: "secondary",
  returned: "outline",
};

export function TransactionsClient({
  transactions,
  items,
}: {
  transactions: TransactionWithDetails[];
  items: Item[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [viewTx, setViewTx] = useState<TransactionWithDetails | null>(null);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [error, setError] = useState("");

  const uniqueUsers = Array.from(
    new Map(transactions.filter((t) => t.profiles?.full_name).map((t) => [t.profiles!.full_name, t.user_id])).entries()
  );

  const hasFilters = actionFilter !== "all" || userFilter !== "all";

  const filteredData = transactions.filter((t) => {
    if (actionFilter !== "all" && t.action !== actionFilter) return false;
    if (userFilter !== "all" && t.user_id !== userFilter) return false;
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
          {new Date(row.getValue("created_at")).toLocaleString()}
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
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      cell: ({ row }) => (
        <span className="max-w-45 truncate block text-muted-foreground text-xs">
          {(row.getValue("remarks") as string) || "\u2014"}
        </span>
      ),
    },
    {
      id: "view",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewTx(row.original)}>
            <Eye className="h-3.5 w-3.5" />
            <span className="sr-only">View details</span>
          </Button>
        </div>
      ),
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
        searchPlaceholder="Search by item or user..."
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
            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setActionFilter("all"); setUserFilter("all"); }}>
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
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Transaction</DialogTitle>
            <DialogDescription>Record a stock movement.</DialogDescription>
          </DialogHeader>
          <form
            action={async (fd) => {
              setError("");
              try {
                await createTransaction(fd);
                setShowForm(false);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to record transaction.");
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Item <span className="text-destructive">*</span></Label>
              <NativeSelect name="item_id" required>
                <option value="">Select item</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>{i.name} (Qty: {i.quantity})</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>Action <span className="text-destructive">*</span></Label>
              <NativeSelect name="action" required>
                <option value="stock_in">Stock In</option>
                <option value="stock_out">Stock Out</option>
                <option value="borrowed">Borrowed</option>
                <option value="returned">Returned</option>
              </NativeSelect>
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
              <Button type="submit">Record Transaction</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Transaction Details Dialog */}
      <Dialog open={!!viewTx} onOpenChange={(open) => { if (!open) setViewTx(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>Full record of this stock movement.</DialogDescription>
          </DialogHeader>
          {viewTx && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Date & Time</span>
                <p className="font-medium">{new Date(viewTx.created_at).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Item</span>
                <p className="font-medium">{viewTx.items?.name ?? "\u2014"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Action</span>
                <p><Badge variant={actionColors[viewTx.action]}>{actionLabels[viewTx.action]}</Badge></p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Quantity</span>
                <p className="font-medium">{viewTx.quantity}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Performed By</span>
                <p className="font-medium">{viewTx.profiles?.full_name ?? "\u2014"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Transaction ID</span>
                <p className="font-mono text-xs text-muted-foreground">{viewTx.id}</p>
              </div>
              {viewTx.remarks && (
                <div className="col-span-2">
                  <span className="text-muted-foreground text-xs">Remarks</span>
                  <p className="font-medium">{viewTx.remarks}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
