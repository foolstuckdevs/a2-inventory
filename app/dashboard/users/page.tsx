import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UsersClient } from "./client";


export default async function UsersPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (me?.role !== "admin") redirect("/dashboard");

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return <UsersClient profiles={profiles ?? []} currentUserId={user!.id} />;
}
