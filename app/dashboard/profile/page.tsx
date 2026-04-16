import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";


export default async function ProfilePage() {
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
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings.</p>
      </div>
      <ProfileForm
        fullName={profile?.full_name ?? ""}
        email={user.email ?? ""}
        role={(profile?.role as string) ?? "employee"}
      />
    </div>
  );
}
