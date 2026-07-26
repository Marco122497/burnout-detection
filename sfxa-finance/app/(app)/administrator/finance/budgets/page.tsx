import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, toNumber } from "@/lib/format";
import { FinancePageHeader } from "@/components/administrator/finance-page-header";
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

export default async function AdminBudgetsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: budgets }, { data: expenses }] = await Promise.all([
    supabase
      .from("budgets")
      .select(
        "budget_id, fiscal_year, allocated_amount, remarks, budget_categories(category_name)"
      )
      .order("fiscal_year", { ascending: false }),
    supabase.from("expenses").select("amount"),
  ]);

  const rows = budgets ?? [];
  const totalBudget = rows.reduce(
    (sum, row) => sum + toNumber(row.allocated_amount),
    0
  );
  const totalExpenses = (expenses ?? []).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Budget Allocation"
        description="Monitor allocated budgets and remaining balance."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Budget</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(totalBudget)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Remaining Budget</CardTitle>
            <CardDescription>Budget minus recorded expenses</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(totalBudget - totalExpenses)}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Budget Lines</CardTitle>
          <CardDescription>Read-only allocation list</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No budgets yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fiscal Year</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const category = Array.isArray(row.budget_categories)
                    ? row.budget_categories[0]?.category_name
                    : (row.budget_categories as { category_name?: string } | null)
                        ?.category_name;
                  return (
                    <TableRow key={row.budget_id}>
                      <TableCell>{row.fiscal_year}</TableCell>
                      <TableCell>{category || "—"}</TableCell>
                      <TableCell className="max-w-[240px] truncate">
                        {row.remarks || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.allocated_amount)}
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
