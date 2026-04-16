import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

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

  return (
    <div className="flex h-screen">
      <Sidebar
        userName={profile?.full_name ?? "User"}
        userRole={(profile?.role as string) ?? "employee"}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          userName={profile?.full_name ?? "User"}
          userRole={(profile?.role as string) ?? "employee"}
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
