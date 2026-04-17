"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Package,
  Layers,
  ArrowLeftRight,
  Users,
  PanelLeftClose,
  PanelLeft,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/items", label: "Items", icon: Package },
  { href: "/dashboard/categories", label: "Categories", icon: Layers },
  { href: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/dashboard/users", label: "Users", icon: Users, adminOnly: true },
];

export function Sidebar({
  userRole,
}: {
  userRole: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Listen for toggle event from header hamburger
  useEffect(() => {
    const handler = () => setMobileOpen(true);
    window.addEventListener("toggle-mobile-menu", handler);
    return () => window.removeEventListener("toggle-mobile-menu", handler);
  }, []);

  const filteredNav = navItems.filter(
    (item) => !item.adminOnly || userRole === "admin"
  );

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold">A2 Inventory</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (mobileOpen) setMobileOpen(false);
            else setCollapsed(!collapsed);
          }}
          className="h-8 w-8 hidden md:flex"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="h-8 w-8 md:hidden">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {filteredNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-0 md:justify-center md:px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {(!collapsed || mobileOpen) && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-2" />
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}

/** Mobile menu trigger for use in Header */
export function useMobileMenu() {
  // This is a simple approach — we dispatch a custom event
  return {
    open: () => window.dispatchEvent(new CustomEvent("toggle-mobile-menu")),
  };
}
