import { requireParishOfficer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, toNumber } from "@/lib/format";
import { ParishReportPageHeader } from "@/components/parish-officer/parish-report-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ParishBudgetReportPage() {
  await requireParishOfficer();
  const supabase = await createClient();

  const [{ data: budgets }, { data: expenses }, { data: expenseCategories }] =
    await Promise.all([
      supabase
        .from("budgets")
        .select(
          "budget_id, fiscal_year, allocated_amount, remarks, budget_categories(category_name)"
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

  const totalAllocated = (budgets ?? []).reduce(
    (sum, row) => sum + toNumber(row.allocated_amount),
    0
  );
  const totalSpent = (expenses ?? []).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );

  return (
    <div className="space-y-6">
      <ParishReportPageHeader
        title="Budget Report"
        description="Read-only budget allocations and utilization overview."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Allocated</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(totalAllocated)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Utilized</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(totalSpent)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Remaining</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(totalAllocated - totalSpent)}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Budget lines</CardTitle>
          <CardDescription>
            Allocated vs spent by matching category name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(budgets ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No budgets yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(budgets ?? []).map((row) => {
                  const category = Array.isArray(row.budget_categories)
                    ? row.budget_categories[0]?.category_name
                    : (
                        row.budget_categories as {
                          category_name?: string;
                        } | null
                      )?.category_name;
                  const allocated = toNumber(row.allocated_amount);
                  const spent = category
                    ? (spentByCategoryName.get(category) ?? 0)
                    : 0;
                  return (
                    <TableRow key={row.budget_id}>
                      <TableCell>{row.fiscal_year}</TableCell>
                      <TableCell>{category || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(allocated)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(spent)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(allocated - spent)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
