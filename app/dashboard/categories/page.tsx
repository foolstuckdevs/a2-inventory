import { Suspense } from "react";
import { getCategories } from "@/lib/actions/categories";
import { CategoriesClient } from "./client";
import PageLoading from "./loading";

async function CategoriesData() {
  const categories = await getCategories();
  return <CategoriesClient categories={categories} />;
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <CategoriesData />
    </Suspense>
  );
}
