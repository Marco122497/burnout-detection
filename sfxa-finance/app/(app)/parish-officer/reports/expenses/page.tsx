import { requireParishOfficer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, toNumber } from "@/lib/format";
import { isReportPeriod } from "@/lib/reports";
import { startOfPeriod } from "@/lib/reports-period";
import { ParishReportPageHeader } from "@/components/parish-officer/parish-report-page-header";
import { ReportPeriodSelect } from "@/components/administrator/report-period-select";
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

export default async function ParishExpenseReportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireParishOfficer();
  const params = await searchParams;
  const period = isReportPeriod(params.period) ? params.period : "monthly";
  const fromDate = startOfPeriod(period);
  const supabase = await createClient();

  const { data: expenses } = await supabase
    .from("expenses")
    .select(
      "expense_id, description, amount, expense_date, expense_categories(category_name)"
    )
    .gte("expense_date", fromDate)
    .order("expense_date", { ascending: false });

  const total = (expenses ?? []).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );

  return (
    <div className="space-y-6">
      <ParishReportPageHeader
        title="Expense Report"
        description="Read-only view of parish expenses for the selected period."
        actions={
          <ReportPeriodSelect
            period={period}
            basePath="/parish-officer/reports/expenses"
          />
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>
            From {formatDate(fromDate)} · Total {formatMoney(total)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(expenses ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No expenses in period.
            </p>
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
                {(expenses ?? []).map((row) => {
                  const category = Array.isArray(row.expense_categories)
                    ? row.expense_categories[0]?.category_name
                    : (
                        row.expense_categories as {
                          category_name?: string;
                        } | null
                      )?.category_name;
                  return (
                    <TableRow key={row.expense_id}>
                      <TableCell>{formatDate(row.expense_date)}</TableCell>
                      <TableCell>{category || "—"}</TableCell>
                      <TableCell className="max-w-[240px] truncate">
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
