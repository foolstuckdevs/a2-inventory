"use client";

import { useState } from "react";
import { updateProfile } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function ProfileForm({
  fullName: initialName,
  email,
  role,
}: {
  fullName: string;
  email: string;
  role: string;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="grid gap-6 max-w-lg mx-auto">
      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Role</span>
            <Badge variant={role === "admin" ? "default" : "secondary"} className="capitalize">
              {role}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Update Name */}
      <Card>
        <CardHeader>
          <CardTitle>Display Name</CardTitle>
          <CardDescription>This is the name shown across the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async (fd) => {
              setLoading(true);
              setMessage("");
              try {
                await updateProfile(fd);
                setMessage("Profile updated successfully!");
              } catch (err) {
                setMessage(err instanceof Error ? err.message : "Failed to update.");
              } finally {
                setLoading(false);
              }
            }}
            className="space-y-4"
          >
            {message && (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                {message}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={initialName}
                required
                placeholder="Enter your full name"
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
