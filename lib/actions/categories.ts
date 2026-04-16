"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createCategorySchema } from "@/lib/validations";

export async function getCategories() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
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

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("categories").insert(parsed.data);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/categories");
}

export async function updateCategory(id: string, formData: FormData) {
  const parsed = createCategorySchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/categories");
}

export async function deleteCategory(id: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/categories");
}
