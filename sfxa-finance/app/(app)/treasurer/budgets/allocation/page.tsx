import { requireTreasurer } from "@/lib/auth/session";
import { getBudgetModuleData } from "@/lib/treasurer/budget-data";
import { BudgetPageHeader } from "@/components/treasurer/budget-page-header";
import { BudgetManager } from "@/components/treasurer/budget-manager";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default async function TreasurerBudgetAllocationPage() {
  await requireTreasurer();
  const { categories, rows } = await getBudgetModuleData();

  return (
    <div className="space-y-6">
      <BudgetPageHeader
        title="Budget Allocation"
        description="Create and update budget allocations by category and fiscal year."
      />
      <Card>
        <CardContent className="pt-6">
          <BudgetManager budgets={rows} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
