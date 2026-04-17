import { Suspense } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getItems, getProfiles } from "@/lib/actions/items";
import { getCategories } from "@/lib/actions/categories";
import type { Profile } from "@/lib/types";
import { ItemsClient } from "./client";
import PageLoading from "./loading";

async function ItemsData() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [items, categories, profiles, profile] = await Promise.all([
    getItems(),
    getCategories(),
    getProfiles(),
    supabase.from("profiles").select("role").eq("id", user!.id).single(),
  ]);

  return (
    <ItemsClient
      items={items as never[]}
      categories={categories}
      profiles={profiles}
      currentUserRole={(profile.data?.role as Profile["role"]) ?? "employee"}
    />
  );
}

export default function ItemsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ItemsData />
    </Suspense>
  );
}
