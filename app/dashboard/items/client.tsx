"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash2, Plus, Eye } from "lucide-react";
import { createItem, updateItem, deleteItem } from "@/lib/actions/items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import type { Category, ItemWithCategory } from "@/lib/types";

export function ItemsClient({
  items,
  categories,
}: {
  items: ItemWithCategory[];
  categories: Category[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItemWithCategory | null>(null);
  const [viewItem, setViewItem] = useState<ItemWithCategory | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [error, setError] = useState("");

  const filteredItems = categoryFilter === "all"
    ? items
    : items.filter((item) => item.category_id === categoryFilter);

  const columns: ColumnDef<ItemWithCategory>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
    },
    {
      id: "category",
      accessorFn: (row) => row.categories?.name ?? "",
      header: "Category",
      cell: ({ row }) => row.original.categories?.name ?? "\u2014",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <Badge variant="outline" className="font-normal capitalize">
            {type.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Qty <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const item = row.original;
        const isLow = item.quantity <= item.reorder_level;
        return <span className={isLow ? "font-bold text-destructive" : ""}>{item.quantity}</span>;
      },
    },
    {
      accessorKey: "unit",
      header: "Unit",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewItem(item)}>
              <Eye className="h-3.5 w-3.5" />
              <span className="sr-only">View</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditItem(item); setFormOpen(true); }}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Items</h1>
        <p className="text-sm text-muted-foreground">Manage your inventory items.</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={filteredItems}
        searchKey="name"
        searchPlaceholder="Search items..."
        filterComponent={
          <>
            <NativeSelect
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 w-35"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </NativeSelect>
            {categoryFilter !== "all" && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => setCategoryFilter("all")}>
                Clear filter
              </Button>
            )}
          </>
        }
        actionComponent={
          <Button size="sm" onClick={() => { setEditItem(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        }
      />

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditItem(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "Add Item"}</DialogTitle>
            <DialogDescription>{editItem ? "Update the item details below." : "Fill in the details to create a new item."}</DialogDescription>
          </DialogHeader>
          <form
            action={async (fd) => {
              setError("");
              try {
                if (editItem) {
                  await updateItem(editItem.id, fd);
                } else {
                  await createItem(fd);
                }
                setFormOpen(false);
                setEditItem(null);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save item.");
              }
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input name="name" required defaultValue={editItem?.name} placeholder="e.g. Printer Paper" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <NativeSelect name="category_id" defaultValue={editItem?.category_id ?? ""}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>Type <span className="text-destructive">*</span></Label>
              <NativeSelect name="type" defaultValue={editItem?.type ?? "consumable"}>
                <option value="consumable">Consumable</option>
                <option value="non_consumable">Non-Consumable</option>
              </NativeSelect>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input name="quantity" type="number" min={0} defaultValue={editItem?.quantity ?? 0} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Reorder Level</Label>
              <Input name="reorder_level" type="number" min={0} defaultValue={editItem?.reorder_level ?? 5} placeholder="5" />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input name="unit" defaultValue={editItem?.unit ?? "pcs"} placeholder="e.g. pcs, kg, boxes" />
            </div>
            <div className="flex gap-2 sm:col-span-2 justify-end">
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditItem(null); }}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(open) => { if (!open) setViewItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewItem?.name}</DialogTitle>
            <DialogDescription>Item details</DialogDescription>
          </DialogHeader>
          {viewItem && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Category</span><p className="font-medium">{viewItem.categories?.name ?? "\u2014"}</p></div>
              <div><span className="text-muted-foreground">Type</span><p className="font-medium capitalize">{viewItem.type.replace("_", " ")}</p></div>
              <div><span className="text-muted-foreground">Quantity</span><p className="font-medium">{viewItem.quantity} {viewItem.unit}</p></div>
              <div><span className="text-muted-foreground">Reorder Level</span><p className="font-medium">{viewItem.reorder_level}</p></div>
              <div><span className="text-muted-foreground">Created</span><p className="font-medium">{new Date(viewItem.created_at).toLocaleDateString()}</p></div>
              <div><span className="text-muted-foreground">Updated</span><p className="font-medium">{new Date(viewItem.updated_at).toLocaleDateString()}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Item"
        description="Are you sure you want to delete this item? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          setError("");
          try {
            if (deleteId) await deleteItem(deleteId);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete item.");
          }
          setDeleteId(null);
        }}
      />
    </div>
  );
}
