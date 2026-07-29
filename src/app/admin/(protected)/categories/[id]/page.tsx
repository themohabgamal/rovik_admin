"use client";

import { use } from "react";
import { CategoryForm } from "@/components/admin/category-form";

export default function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <CategoryForm categoryId={id} />;
}
