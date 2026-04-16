import { getItems } from "@/lib/actions/items";
import { getCategories } from "@/lib/actions/categories";
import { ItemsClient } from "./client";

export default async function ItemsPage() {
  const [items, categories] = await Promise.all([getItems(), getCategories()]);
  return <ItemsClient items={items as never[]} categories={categories} />;
}
