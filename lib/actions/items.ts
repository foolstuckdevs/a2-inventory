"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createItemSchema, updateItemSchema } from "@/lib/validations";

export async function getItems() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("items")
    .select("*, categories(*)")
    .order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function getItem(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("items")
    .select("*, categories(*)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getLowStockItems() {
  const supabase = await createServerSupabaseClient();
  // Supabase doesn't support column-to-column comparison in filters,
  // so we fetch all and filter in JS
  const { data: all, error } = await supabase
    .from("items")
    .select("*, categories(*)");
  if (error) throw new Error(error.message);
  return (all ?? []).filter((i) => i.quantity <= i.reorder_level);
}

export async function createItem(formData: FormData) {
  const parsed = createItemSchema.safeParse({
    name: formData.get("name"),
    category_id: (formData.get("category_id") as string) || null,
    type: formData.get("type"),
    quantity: Number(formData.get("quantity") || 0),
    reorder_level: Number(formData.get("reorder_level") || 5),
    unit: (formData.get("unit") as string) || "pcs",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("items").insert(parsed.data);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/items");
}

export async function updateItem(id: string, formData: FormData) {
  const parsed = updateItemSchema.safeParse({
    name: formData.get("name"),
    category_id: (formData.get("category_id") as string) || null,
    type: formData.get("type"),
    quantity: Number(formData.get("quantity") || 0),
    reorder_level: Number(formData.get("reorder_level") || 5),
    unit: (formData.get("unit") as string) || "pcs",
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("items").update(parsed.data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/items");
}

export async function deleteItem(id: string) {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/items");
}
