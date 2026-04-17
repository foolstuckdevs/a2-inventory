"use client";

import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Pencil, Trash2, Plus } from "lucide-react";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Category } from "@/lib/types";

export function CategoriesClient({ categories }: { categories: Category[] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const columns: ColumnDef<Category>[] = [
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
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditCat(cat); setFormOpen(true); }}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only">Edit</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(cat.id)}>
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
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-sm text-muted-foreground">Manage item categories.</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={categories}
        searchKey="name"
        searchPlaceholder="Search categories..."
        actionComponent={
          <Button size="sm" onClick={() => { setEditCat(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        }
      />

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditCat(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editCat ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>{editCat ? "Update the category name." : "Enter a name for the new category."}</DialogDescription>
          </DialogHeader>
          <form
            action={async (fd) => {
              setError("");
              try {
                if (editCat) {
                  await updateCategory(editCat.id, fd);
                } else {
                  await createCategory(fd);
                }
                setFormOpen(false);
                setEditCat(null);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to save category.");
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Category Name <span className="text-destructive">*</span></Label>
              <Input name="name" required defaultValue={editCat?.name} placeholder="e.g. Office Supplies" autoFocus />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditCat(null); }}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete Category"
        description="Are you sure you want to delete this category? Items in this category will become uncategorized."
        confirmLabel="Delete"
        onConfirm={async () => {
          setError("");
          try {
            if (deleteId) await deleteCategory(deleteId);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete category.");
          }
          setDeleteId(null);
        }}
      />
    </div>
  );
}
