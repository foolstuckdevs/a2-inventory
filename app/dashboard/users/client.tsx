"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Plus, Trash2, ShieldCheck, ShieldMinus } from "lucide-react";
import { createUser, deleteUser, updateUserRole } from "@/lib/actions/users";
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
import type { Profile } from "@/lib/types";

export function UsersClient({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const columns: ColumnDef<Profile>[] = [
    {
      accessorKey: "full_name",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shrink-0">
            {(row.getValue("full_name") as string)
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <span className="font-medium">{row.getValue("full_name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const role = row.getValue("role") as string;
        return (
          <Badge variant={role === "admin" ? "default" : "secondary"} className="capitalize">
            {role}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Joined <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {new Date(row.getValue("created_at")).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const profile = row.original;
        const isSelf = profile.id === currentUserId;
        const isAdmin = profile.role === "admin";

        if (isSelf) {
          return <span className="text-xs text-muted-foreground">You</span>;
        }

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={isAdmin ? "Demote to employee" : "Promote to admin"}
              onClick={async () => {
                try {
                  await updateUserRole(profile.id, isAdmin ? "employee" : "admin");
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed");
                }
              }}
            >
              {isAdmin ? <ShieldMinus className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleteId(profile.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">Create and manage employee accounts.</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={profiles}
        searchKey="full_name"
        searchPlaceholder="Search users..."
        actionComponent={
          <Button size="sm" onClick={() => { setShowCreate(true); setError(""); }}>
            <Plus className="h-4 w-4" /> Create User
          </Button>
        }
      />

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Create a new employee account.</DialogDescription>
          </DialogHeader>
          <form
            action={async (fd) => {
              setError("");
              try {
                await createUser(fd);
                setShowCreate(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to create user.");
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input name="full_name" required placeholder="e.g. John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input name="email" type="email" required placeholder="e.g. john@company.com" />
            </div>
            <div className="space-y-2">
              <Label>Password <span className="text-destructive">*</span></Label>
              <Input name="password" type="password" required minLength={6} placeholder="Min. 6 characters" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <NativeSelect name="role" defaultValue="employee">
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </NativeSelect>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit">Create Account</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        title="Delete User"
        description="Are you sure you want to delete this user? This will permanently remove their account and cannot be undone."
        confirmLabel="Delete User"
        onConfirm={async () => {
          if (deleteId) {
            try {
              await deleteUser(deleteId);
              router.refresh();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to delete.");
            }
            setDeleteId(null);
          }
        }}
      />
    </div>
  );
}
