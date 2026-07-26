import { requireTreasurer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BudgetPageHeader } from "@/components/treasurer/budget-page-header";
import { CategoryManager } from "@/components/administrator/category-manager";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default async function TreasurerBudgetCategoriesPage() {
  await requireTreasurer();
  const supabase = await createClient();

  const { data } = await supabase
    .from("budget_categories")
    .select("budget_category_id, category_name")
    .order("category_name");

  const categories = (data ?? []).map((row) => ({
    id: row.budget_category_id,
    name: row.category_name,
  }));

  return (
    <div className="space-y-6">
      <BudgetPageHeader
        title="Budget Categories"
        description="Create and maintain budget categories used for allocations."
      />
      <Card>
        <CardContent className="pt-6">
          <CategoryManager kind="budget" categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
