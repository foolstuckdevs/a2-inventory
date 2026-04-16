"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { createUserSchema, updateUserRoleSchema } from "@/lib/validations";

/** Admin-only: get all profiles */
export async function getProfiles() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

/** Admin-only: create a new user account via Supabase Auth Admin API */
export async function createUser(formData: FormData) {
  // Verify caller is admin
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error("Unauthorized.");

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    role: formData.get("role") || "employee",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (serviceRoleKey.startsWith("sb_publishable_")) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is set to a publishable key. Use the service_role key from Supabase settings.");
  }

  // Use service role client to create user via admin API
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: newUser, error: authError } = await serviceClient.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    app_metadata: {
      role: parsed.data.role,
    },
    user_metadata: {
      full_name: parsed.data.full_name,
      role: parsed.data.role,
    },
  });

  if (authError) {
    throw new Error(`Auth createUser failed: ${authError.message}`);
  }

  // Manually insert profile using service role (bypasses RLS and avoids trigger issues)
  if (newUser?.user) {
    const { error: profileError } = await serviceClient
      .from("profiles")
      .upsert({
        id: newUser.user.id,
        full_name: parsed.data.full_name,
        role: parsed.data.role,
      }, { onConflict: "id" });
    if (profileError) {
      throw new Error(`Profile upsert failed: ${profileError.message}`);
    }
  }

  revalidatePath("/dashboard/users");
}

/** Admin-only: delete a user account */
export async function deleteUser(userId: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error("Unauthorized.");

  if (userId === user.id) throw new Error("You cannot delete your own account.");

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error } = await serviceClient.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/users");
}

/** Admin-only: update a user's role */
export async function updateUserRole(userId: string, newRole: string) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") throw new Error("Unauthorized.");

  const parsed = updateUserRoleSchema.safeParse({ role: newRole });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  // Use service role to update profile and auth metadata
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Update profile role
  const { error: profileError } = await serviceClient
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", userId);
  if (profileError) throw new Error(profileError.message);

  // Update auth app_metadata
  const { error: authError } = await serviceClient.auth.admin.updateUserById(
    userId,
    { app_metadata: { role: parsed.data.role } }
  );
  if (authError) throw new Error(authError.message);

  revalidatePath("/dashboard/users");
}
