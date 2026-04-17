"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { createCategory } from "@/lib/actions/categories";
import { createItem, deleteItem, updateItem } from "@/lib/actions/items";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CategoryOption,
  ItemWithCategory,
  Profile,
  ProfileOption,
} from "@/lib/types";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  damaged: "secondary",
  lost: "destructive",
  disposed: "outline",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  damaged: "Damaged",
  lost: "Lost",
  disposed: "Disposed",
};

function sortCategories(categories: CategoryOption[]) {
  return [...categories].sort((left, right) => left.name.localeCompare(right.name));
}

export function ItemsClient({
  items,
  categories,
  profiles,
  currentUserRole,
}: {
  items: ItemWithCategory[];
  categories: CategoryOption[];
  profiles: ProfileOption[];
  currentUserRole: Profile["role"];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<ItemWithCategory | null>(null);
  const [viewItem, setViewItem] = useState<ItemWithCategory | null>(null);
  const [itemPendingDelete, setItemPendingDelete] = useState<ItemWithCategory | null>(null);
  const [localCategories, setLocalCategories] = useState<CategoryOption[]>(categories);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedAssignedTo, setSelectedAssignedTo] = useState("");
  const [formType, setFormType] = useState<string>("consumable");
  const [deleteReason, setDeleteReason] = useState("");
  const [error, setError] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const [submittingForm, setSubmittingForm] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [submittingCategory, setSubmittingCategory] = useState(false);

  const categoryFilter = searchParams.get("category") ?? "all";
  const statusFilter = searchParams.get("status") ?? "all";
  const canManageItems = currentUserRole === "admin";

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    if (!formOpen) return;

    setFormType(editItem?.type ?? "consumable");
    setSelectedCategoryId(editItem?.category_id ?? "");
    setSelectedAssignedTo(editItem?.assigned_to ?? "");
  }, [editItem, formOpen]);

  useEffect(() => {
    const itemId = searchParams.get("item");
    if (!itemId) {
      setViewItem(null);
      return;
    }

    const matchedItem = items.find((item) => item.id === itemId) ?? null;
    setViewItem(matchedItem);
  }, [items, searchParams]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (categoryFilter !== "all" && item.category_id !== categoryFilter) return false;
        if (statusFilter === "low_stock") {
          return item.quantity > 0 && item.quantity <= item.reorder_level;
        }
        if (statusFilter === "out_of_stock") {
          return item.quantity === 0;
        }
        if (statusFilter !== "all" && item.status !== statusFilter) return false;
        return true;
      }),
    [categoryFilter, items, statusFilter]
  );

  const hasFilters = categoryFilter !== "all" || statusFilter !== "all";
  const categoryOptions = [{ value: "", label: "None" }, ...localCategories.map((category) => ({ value: category.id, label: category.name }))];
  const assigneeOptions = [{ value: "", label: "Unassigned" }, ...profiles.map((profile) => ({ value: profile.id, label: profile.full_name }))];

  function updateSearchParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const nextPath = params.size ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextPath, { scroll: false });
  }

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
      cell: ({ row }) => row.original.categories?.name ?? "—",
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
      meta: { mobileHidden: true, mobileLabel: "Type" },
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
        const isLowStock = item.quantity > 0 && item.quantity <= item.reorder_level;

        return (
          <div className="space-y-1">
            <span className={isLowStock ? "font-semibold text-destructive" : item.quantity === 0 ? "font-semibold text-muted-foreground" : "font-medium"}>
              {item.quantity}
            </span>
            {item.quantity === 0 ? <p className="text-xs text-muted-foreground">Out of stock</p> : null}
            {isLowStock ? <p className="text-xs text-destructive">Low stock</p> : null}
          </div>
        );
      },
    },
    {
      accessorKey: "unit",
      header: "Unit",
      meta: { mobileHidden: true, mobileLabel: "Unit" },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = (row.getValue("status") as string) || "active";
        return <Badge variant={statusColors[status]}>{statusLabels[status]}</Badge>;
      },
    },
    {
      id: "assigned_to",
      accessorFn: (row) => row.profiles?.full_name ?? "",
      header: "Assigned To",
      cell: ({ row }) => row.original.profiles?.full_name ?? "—",
      meta: { mobileHidden: true, mobileLabel: "Assigned To" },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;

        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateSearchParams({ item: item.id })}>
              <Eye className="h-3.5 w-3.5" />
              <span className="sr-only">View</span>
            </Button>
            {canManageItems ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setEditItem(item);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => {
                    setItemPendingDelete(item);
                    setDeleteReason("");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </>
            ) : null}
          </div>
        );
      },
      meta: { mobileHidden: true, mobileLabel: "Actions", cellClassName: "w-[120px]" },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Items</h1>
        <p className="text-sm text-muted-foreground">Manage your inventory items.</p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>Dismiss</button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={filteredItems}
        searchKey="name"
        searchPlaceholder="Search items..."
        filterComponent={
          <>
            <NativeSelect
              value={categoryFilter}
              onChange={(event) => updateSearchParams({ category: event.target.value, item: null })}
              className="h-9 w-full sm:w-40"
            >
              <option value="all">All Categories</option>
              {localCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </NativeSelect>
            <NativeSelect
              value={statusFilter}
              onChange={(event) => updateSearchParams({ status: event.target.value, item: null })}
              className="h-9 w-full sm:w-36"
            >
              <option value="all">All Status</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </NativeSelect>
            {hasFilters ? (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => updateSearchParams({ category: null, status: null, item: null })}>
                Clear filters
              </Button>
            ) : null}
          </>
        }
        actionComponent={
          <Button
            size="sm"
            onClick={() => {
              setEditItem(null);
              setSelectedCategoryId("");
              setSelectedAssignedTo("");
              setFormType("consumable");
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        }
      />

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditItem(null);
            setCategoryDialogOpen(false);
            setCategoryError("");
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit Item" : "Add Item"}</DialogTitle>
            <DialogDescription>
              {editItem ? "Update the item details below." : "Fill in the details to create a new item."}
            </DialogDescription>
          </DialogHeader>
          <form
            key={editItem?.id ?? "new-item"}
            action={async (formData) => {
              if (submittingForm) return;

              setSubmittingForm(true);
              setError("");

              try {
                if (editItem) {
                  await updateItem(editItem.id, formData);
                } else {
                  await createItem(formData);
                }

                setFormOpen(false);
                setEditItem(null);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save item.");
              } finally {
                setSubmittingForm(false);
              }
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input name="name" required defaultValue={editItem?.name} placeholder="e.g. Printer Paper" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Category</Label>
                <Button type="button" variant="ghost" size="sm" className="h-auto px-0 text-xs" onClick={() => setCategoryDialogOpen(true)}>
                  Create new
                </Button>
              </div>
              <SearchableSelect
                name="category_id"
                placeholder="Search categories..."
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
                options={categoryOptions}
              />
            </div>
            <div className="space-y-2">
              <Label>Type <span className="text-destructive">*</span></Label>
              <NativeSelect
                name="type"
                defaultValue={editItem?.type ?? "consumable"}
                onChange={(event) => {
                  const nextType = event.target.value;
                  setFormType(nextType);
                  if (nextType === "consumable") {
                    setSelectedAssignedTo("");
                  }
                }}
              >
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
            <div className="space-y-2">
              <Label>Status</Label>
              <NativeSelect name="status" defaultValue={editItem?.status ?? "active"}>
                <option value="active">Active</option>
                <option value="damaged">Damaged</option>
                <option value="lost">Lost</option>
                <option value="disposed">Disposed</option>
              </NativeSelect>
            </div>
            {formType === "non_consumable" ? (
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <SearchableSelect
                  name="assigned_to"
                  placeholder="Search employees..."
                  value={selectedAssignedTo}
                  onValueChange={setSelectedAssignedTo}
                  options={assigneeOptions}
                />
              </div>
            ) : null}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingForm}>
                {submittingForm ? "Saving..." : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>Add a category without leaving the item form.</DialogDescription>
          </DialogHeader>
          {categoryError ? (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {categoryError}
            </div>
          ) : null}
          <form
            action={async (formData) => {
              if (submittingCategory) return;

              setSubmittingCategory(true);
              setCategoryError("");

              try {
                const createdCategory = await createCategory(formData);
                const nextCategories = sortCategories([...localCategories, createdCategory]);
                setLocalCategories(nextCategories);
                setSelectedCategoryId(createdCategory.id);
                setCategoryDialogOpen(false);
              } catch (err) {
                setCategoryError(err instanceof Error ? err.message : "Failed to create category.");
              } finally {
                setSubmittingCategory(false);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Category Name <span className="text-destructive">*</span></Label>
              <Input name="name" required placeholder="e.g. Office Supplies" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submittingCategory}>
                {submittingCategory ? "Creating..." : "Create Category"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewItem} onOpenChange={(open) => !open && updateSearchParams({ item: null })}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewItem?.name}
              {viewItem ? (
                <Badge variant="outline" className="font-normal capitalize">
                  {viewItem.type.replace("_", " ")}
                </Badge>
              ) : null}
            </DialogTitle>
            <DialogDescription>Item details</DialogDescription>
          </DialogHeader>
          {viewItem ? (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">General</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Category</span>
                    <p className="font-medium">{viewItem.categories?.name ?? "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Status</span>
                    <p><Badge variant={statusColors[viewItem.status || "active"]}>{statusLabels[viewItem.status || "active"]}</Badge></p>
                  </div>
                </div>
              </div>
              <hr className="border-border" />
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Stock</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground">Quantity</span>
                    <p className="font-medium">{viewItem.quantity} {viewItem.unit}</p>
                    {viewItem.quantity === 0 ? <span className="text-xs font-semibold text-muted-foreground">Out of stock</span> : null}
                    {viewItem.quantity > 0 && viewItem.quantity <= viewItem.reorder_level ? <span className="text-xs font-semibold text-destructive">Low stock</span> : null}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Reorder Level</span>
                    <p className="font-medium">{viewItem.reorder_level}</p>
                  </div>
                </div>
              </div>
              {viewItem.type === "non_consumable" ? (
                <>
                  <hr className="border-border" />
                  <div>
                    <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Assignment</h4>
                    <div>
                      <span className="text-xs text-muted-foreground">Assigned To</span>
                      <p className="font-medium">{viewItem.profiles?.full_name ?? "—"}</p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!itemPendingDelete}
        onOpenChange={(open) => {
          if (!open) {
            setItemPendingDelete(null);
            setDeleteReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Explain why {itemPendingDelete?.name ? `“${itemPendingDelete.name}”` : "this item"} should be removed. This is recorded for audit purposes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="delete-reason">Reason <span className="text-destructive">*</span></Label>
              <Textarea
                id="delete-reason"
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                placeholder="e.g. Duplicate record created during inventory intake"
                rows={4}
              />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!itemPendingDelete || submittingDelete) return;

                  setSubmittingDelete(true);
                  setError("");

                  try {
                    await deleteItem(itemPendingDelete.id, deleteReason);
                    setItemPendingDelete(null);
                    setDeleteReason("");
                    router.refresh();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to delete item.");
                  } finally {
                    setSubmittingDelete(false);
                  }
                }}
                disabled={deleteReason.trim().length < 5 || submittingDelete}
              >
                {submittingDelete ? "Deleting..." : "Delete item"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setItemPendingDelete(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
