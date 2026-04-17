"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createItemSchema, deleteItemSchema, updateItemSchema } from "@/lib/validations";

async function requireAuthenticatedProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to manage items.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new Error("Unable to load your profile.");
  }

  return { supabase, user, profile };
}

export async function getItems() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("items")
    .select("*, categories(id, name), profiles:assigned_to(id, full_name)")
    .order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function getItem(id: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("items")
    .select("*, categories(*), profiles:assigned_to(id, full_name)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getLowStockItems() {
  const supabase = await createServerSupabaseClient();
  const { data: all, error } = await supabase
    .from("items")
    .select("*, categories(id, name)");
  if (error) throw new Error(error.message);
  return (all ?? []).filter((item) => item.quantity > 0 && item.quantity <= item.reorder_level);
}

export async function getProfiles() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .order("full_name");
  if (error) throw new Error(error.message);
  return data;
}

export async function createItem(formData: FormData) {
  const parsed = createItemSchema.safeParse({
    name: formData.get("name"),
    category_id: (formData.get("category_id") as string) || null,
    type: formData.get("type"),
    quantity: Number(formData.get("quantity") || 0),
    reorder_level: Number(formData.get("reorder_level") || 5),
    unit: (formData.get("unit") as string) || "pcs",
    status: (formData.get("status") as string) || "active",
    assigned_to: (formData.get("assigned_to") as string) || null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const { supabase, profile } = await requireAuthenticatedProfile();
  const { data: createdItem, error } = await supabase
    .from("items")
    .insert(parsed.data)
    .select("id, name, categories(name)")
    .single();
  if (error) throw new Error(error.message);

  const { data: recipients, error: recipientsError } = await supabase
    .from("profiles")
    .select("id");

  if (!recipientsError && recipients?.length) {
    const categoryName = Array.isArray(createdItem.categories)
      ? createdItem.categories[0]?.name
      : createdItem.categories?.name;

    const { error: notificationError } = await supabase.from("notifications").insert(
      recipients.map((recipient) => ({
        user_id: recipient.id,
        item_id: createdItem.id,
        title: "New item added",
        message: `${createdItem.name} was added${categoryName ? ` under ${categoryName}` : ""} by ${profile.full_name}.`,
      }))
    );

    if (notificationError) {
      console.error("Failed to create notifications", notificationError);
    }
  }

  revalidatePath("/dashboard/items");
  revalidatePath("/dashboard");
  return createdItem;
}

export async function updateItem(id: string, formData: FormData) {
  const parsed = updateItemSchema.safeParse({
    name: formData.get("name"),
    category_id: (formData.get("category_id") as string) || null,
    type: formData.get("type"),
    quantity: Number(formData.get("quantity") || 0),
    reorder_level: Number(formData.get("reorder_level") || 5),
    unit: (formData.get("unit") as string) || "pcs",
    status: (formData.get("status") as string) || "active",
    assigned_to: (formData.get("assigned_to") as string) || null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const { supabase, profile } = await requireAuthenticatedProfile();
  if (profile.role !== "admin") {
    throw new Error("Only admins can edit items.");
  }

  const { error } = await supabase.from("items").update(parsed.data).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/items");
  revalidatePath("/dashboard");
}

export async function deleteItem(id: string, reason: string) {
  const parsed = deleteItemSchema.safeParse({ reason });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join(", "));
  }

  const { supabase, user, profile } = await requireAuthenticatedProfile();
  if (profile.role !== "admin") {
    throw new Error("Only admins can delete items.");
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, name")
    .eq("id", id)
    .single();

  if (itemError || !item) {
    throw new Error("Item not found.");
  }

  const { error: logError } = await supabase.from("item_deletion_logs").insert({
    item_id: item.id,
    item_name: item.name,
    deleted_by: user.id,
    reason: parsed.data.reason,
  });

  if (logError) throw new Error(logError.message);

  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/items");
  revalidatePath("/dashboard");
}
