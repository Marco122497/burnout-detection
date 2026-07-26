import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { CategoryKind } from "@/app/actions/categories";
import { isCollectionCategoryName } from "@/lib/categories";
import { CategoryPageHeader } from "@/components/administrator/category-page-header";
import { CategoryManager } from "@/components/administrator/category-manager";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

async function loadCategories(kind: CategoryKind) {
  const supabase = await createClient();

  if (kind === "donation" || kind === "collection") {
    const { data } = await supabase
      .from("donation_categories")
      .select("category_id, category_name")
      .order("category_name");

    return (data ?? [])
      .filter((row) =>
        kind === "collection"
          ? isCollectionCategoryName(row.category_name)
          : !isCollectionCategoryName(row.category_name)
      )
      .map((row) => ({
        id: row.category_id,
        name: row.category_name,
      }));
  }

  if (kind === "expense") {
    const { data } = await supabase
      .from("expense_categories")
      .select("expense_category_id, category_name")
      .order("category_name");
    return (data ?? []).map((row) => ({
      id: row.expense_category_id,
      name: row.category_name,
    }));
  }

  const { data } = await supabase
    .from("budget_categories")
    .select("budget_category_id, category_name")
    .order("category_name");
  return (data ?? []).map((row) => ({
    id: row.budget_category_id,
    name: row.category_name,
  }));
}

export async function AdminCategoriesSection({
  kind,
  title,
  description,
}: {
  kind: CategoryKind;
  title: string;
  description: string;
}) {
  await requireAdmin();
  const categories = await loadCategories(kind);

  return (
    <div className="space-y-6">
      <CategoryPageHeader title={title} description={description} />
      <Card>
        <CardContent className="pt-6">
          <CategoryManager kind={kind} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
