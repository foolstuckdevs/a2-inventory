import { Suspense } from "react";
import { getItems, getProfiles } from "@/lib/actions/items";
import { getCategories } from "@/lib/actions/categories";
import { ItemsClient } from "./client";
import PageLoading from "./loading";

async function ItemsData() {
  const [items, categories, profiles] = await Promise.all([getItems(), getCategories(), getProfiles()]);
  return <ItemsClient items={items as never[]} categories={categories} profiles={profiles} />;
}

export default function ItemsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <ItemsData />
    </Suspense>
  );
}
