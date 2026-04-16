"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updateProfileSchema } from "@/lib/validations";

export async function updateProfile(formData: FormData) {
  const parsed = updateProfileSchema.safeParse({
    full_name: formData.get("full_name"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.full_name.trim() } as never)
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard", "layout");
}

export async function getProfile() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}
