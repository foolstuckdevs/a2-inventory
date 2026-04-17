"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, LogOut, Menu, User } from "lucide-react";
import { markNotificationAsRead } from "@/lib/actions/notifications";
import type { NotificationWithItem } from "@/lib/types";
import { formatShortDateTime } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Header({
  userName,
  userRole,
  notifications,
}: {
  userName: string;
  userRole: string;
  notifications: NotificationWithItem[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [notificationItems, setNotificationItems] = useState(notifications);

  useEffect(() => {
    setNotificationItems(notifications);
  }, [notifications]);

  const unreadCount = notificationItems.filter((notification) => !notification.read_at).length;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleNotificationSelect(notification: NotificationWithItem) {
    if (!notification.read_at) {
      setNotificationItems((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item))
      );

      try {
        await markNotificationAsRead(notification.id);
      } catch {
        router.refresh();
      }
    }

    router.push(notification.item_id ? `/dashboard/items?item=${notification.item_id}` : "/dashboard/items");
  }

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center justify-between px-6">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          onClick={() => window.dispatchEvent(new CustomEvent("toggle-mobile-menu"))}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
        <div className="hidden md:block" />

        <div className="flex items-center gap-1.5 sm:gap-3">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="Notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 ? (
                  <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notificationItems.length ? (
                notificationItems.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="items-start gap-3 py-2"
                    onSelect={(event) => {
                      event.preventDefault();
                      void handleNotificationSelect(notification);
                    }}
                  >
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${notification.read_at ? "bg-muted" : "bg-primary"}`} />
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium">{notification.title}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
                      <p className="text-[11px] text-muted-foreground">{formatShortDateTime(notification.created_at)}</p>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet.
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex h-auto items-center gap-2.5 px-2 py-1.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {getInitials(userName)}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-semibold leading-none">{userName}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">{userRole}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="cursor-pointer">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
