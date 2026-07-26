import { createClient } from "@/lib/supabase/server";
import { toNumber } from "@/lib/format";
import { relationName } from "@/lib/treasurer/relations";

export type BudgetAllocationRow = {
  budget_id: number;
  budget_category_id: number | null;
  fiscal_year: number;
  allocated_amount: number | string;
  remarks: string | null;
  category_name: string | null;
  spent: number;
  remaining: number;
  utilizationPct: number;
};

export async function getBudgetModuleData() {
  const supabase = await createClient();

  const [
    { data: categories },
    { data: budgets },
    { data: expenses },
    { data: expenseCategories },
  ] = await Promise.all([
    supabase
      .from("budget_categories")
      .select("budget_category_id, category_name")
      .order("category_name"),
    supabase
      .from("budgets")
      .select(
        "budget_id, budget_category_id, fiscal_year, allocated_amount, remarks, budget_categories(category_name)"
      )
      .order("fiscal_year", { ascending: false }),
    supabase.from("expenses").select("amount, expense_category_id"),
    supabase
      .from("expense_categories")
      .select("expense_category_id, category_name"),
  ]);

  const expenseNameById = new Map(
    (expenseCategories ?? []).map((c) => [
      c.expense_category_id,
      c.category_name,
    ])
  );

  const spentByCategoryName = new Map<string, number>();
  for (const row of expenses ?? []) {
    const name = expenseNameById.get(row.expense_category_id ?? -1);
    if (!name) continue;
    spentByCategoryName.set(
      name,
      (spentByCategoryName.get(name) ?? 0) + toNumber(row.amount)
    );
  }

  const rows: BudgetAllocationRow[] = (budgets ?? []).map((row) => {
    const category_name = relationName(
      row.budget_categories as
        | { category_name?: string }
        | { category_name?: string }[]
        | null
    );
    const allocated = toNumber(row.allocated_amount);
    const spent = category_name
      ? (spentByCategoryName.get(category_name) ?? 0)
      : 0;
    const remaining = allocated - spent;
    const utilizationPct =
      allocated > 0 ? Math.min(100, Math.round((spent / allocated) * 100)) : 0;

    return {
      budget_id: row.budget_id,
      budget_category_id: row.budget_category_id,
      fiscal_year: row.fiscal_year,
      allocated_amount: row.allocated_amount,
      remarks: row.remarks,
      category_name,
      spent,
      remaining,
      utilizationPct,
    };
  });

  const totalAllocated = rows.reduce(
    (sum, row) => sum + toNumber(row.allocated_amount),
    0
  );
  const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);

  return {
    categories: categories ?? [],
    rows,
    totals: {
      allocated: totalAllocated,
      utilized: totalSpent,
      remaining: totalAllocated - totalSpent,
      utilizationPct:
        totalAllocated > 0
          ? Math.min(100, Math.round((totalSpent / totalAllocated) * 100))
          : 0,
    },
  };
}
