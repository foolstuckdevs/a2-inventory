import { getCategories } from "@/lib/actions/categories";
import { CategoriesClient } from "./client";

export default async function CategoriesPage() {
  const categories = await getCategories();
  return <CategoriesClient categories={categories} />;
}
