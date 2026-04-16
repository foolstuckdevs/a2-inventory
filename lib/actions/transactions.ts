"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createTransactionSchema } from "@/lib/validations";

export async function getTransactions() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, items(*), profiles(*)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

export async function createTransaction(formData: FormData) {
  const parsed = createTransactionSchema.safeParse({
    item_id: formData.get("item_id"),
    action: formData.get("action"),
    quantity: Number(formData.get("quantity") || 1),
    remarks: (formData.get("remarks") as string) || null,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  const supabase = await createServerSupabaseClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to record a transaction.");
  }

  // Use RPC for atomic transaction + quantity update
  const { error } = await supabase.rpc("create_transaction_atomic", {
    p_item_id: parsed.data.item_id,
    p_user_id: user.id,
    p_action: parsed.data.action,
    p_quantity: parsed.data.quantity,
    p_remarks: parsed.data.remarks,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/items");
  revalidatePath("/dashboard");
}
