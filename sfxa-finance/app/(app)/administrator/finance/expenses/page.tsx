import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, toNumber } from "@/lib/format";
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

export default async function AdminExpensesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("expenses")
    .select(
      "expense_id, description, amount, expense_date, expense_categories(category_name)"
    )
    .order("expense_date", { ascending: false })
    .limit(100);

  const rows = data ?? [];
  const total = rows.reduce((sum, row) => sum + toNumber(row.amount), 0);

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Expenses"
        description="Monitor parish expenses (read-only)."
      />
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
          <CardDescription>Total shown: {formatMoney(total)}</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const category = Array.isArray(row.expense_categories)
                    ? row.expense_categories[0]?.category_name
                    : (row.expense_categories as { category_name?: string } | null)
                        ?.category_name;
                  return (
                    <TableRow key={row.expense_id}>
                      <TableCell>{formatDate(row.expense_date)}</TableCell>
                      <TableCell>{category || "—"}</TableCell>
                      <TableCell className="max-w-[260px] truncate">
                        {row.description || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.amount)}
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
