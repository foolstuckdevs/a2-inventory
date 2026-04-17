import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import type { NotificationWithItem } from "@/lib/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, user_id, item_id, title, message, created_at, read_at, items(id, name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(12);

  return (
    <div className="flex h-screen">
      <Sidebar
        userRole={(profile?.role as string) ?? "employee"}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userName={profile?.full_name ?? "User"}
          userRole={(profile?.role as string) ?? "employee"}
          notifications={(notifications as NotificationWithItem[] | null) ?? []}
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
