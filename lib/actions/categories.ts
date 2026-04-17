"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCategorySchema } from "@/lib/validations";

async function requireAuthenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to manage categories.");
  }

  return supabase;
}

export async function getCategories() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function createCategory(formData: FormData) {
  const parsed = createCategorySchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const supabase = await requireAuthenticatedUser();
  const { data, error } = await supabase
    .from("categories")
    .insert(parsed.data)
    .select("id, name")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/items");
  return data;
}

export async function updateCategory(id: string, formData: FormData) {
  const parsed = createCategorySchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const supabase = await requireAuthenticatedUser();
  const { error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/items");
}

export async function deleteCategory(id: string) {
  const supabase = await requireAuthenticatedUser();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/categories");
  revalidatePath("/dashboard/items");
}
