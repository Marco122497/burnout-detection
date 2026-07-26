import { requireTreasurer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, toNumber } from "@/lib/format";
import { isReportPeriod } from "@/lib/reports";
import { ReportExportButtons } from "@/components/administrator/report-export-buttons";
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

function startOfPeriod(period: string) {
  const now = new Date();
  const start = new Date(now);

  if (period === "daily") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else if (period === "monthly") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (period === "annual") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }

  return start.toISOString().slice(0, 10);
}

export default async function TreasurerReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireTreasurer();
  const params = await searchParams;
  const period = isReportPeriod(params.period) ? params.period : "monthly";
  const fromDate = startOfPeriod(period);
  const supabase = await createClient();

  const [{ data: donations }, { data: expenses }, { data: budgets }] =
    await Promise.all([
      supabase
        .from("donations")
        .select("donation_id, donor_name, amount, donation_date, remarks")
        .gte("donation_date", fromDate)
        .order("donation_date", { ascending: false }),
      supabase
        .from("expenses")
        .select("expense_id, description, amount, expense_date")
        .gte("expense_date", fromDate)
        .order("expense_date", { ascending: false }),
      supabase
        .from("budgets")
        .select(
          "budget_id, fiscal_year, allocated_amount, remarks, budget_categories(category_name)"
        )
        .order("fiscal_year", { ascending: false }),
    ]);

  const income = (donations ?? []).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );
  const expenseTotal = (expenses ?? []).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );
  const budgetTotal = (budgets ?? []).reduce(
    (sum, row) => sum + toNumber(row.allocated_amount),
    0
  );
  const cashFlow = income - expenseTotal;

  const exportRows = [
    ["Type", "Date", "Details", "Amount"],
    ...(donations ?? []).map((row) => [
      "Income",
      row.donation_date,
      row.donor_name || row.remarks || "Donation",
      String(row.amount),
    ]),
    ...(expenses ?? []).map((row) => [
      "Expense",
      row.expense_date,
      row.description || "Expense",
      String(row.amount),
    ]),
    ["Cash Flow", fromDate, "Income - Expenses", String(cashFlow)],
    ["Budget Remaining", fromDate, "Allocated - Expenses", String(budgetTotal - expenseTotal)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily and monthly income, expenses, budget, and cash flow reports.
          </p>
        </div>
        <ReportExportButtons
          filename={`sfxa-treasurer-${period}-report`}
          rows={exportRows}
          title={`SFXA Treasurer ${period} report`}
        />
      </div>

      <ReportPeriodSelect period={period} basePath="/treasurer/reports" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Income</CardTitle>
            <CardDescription>From {formatDate(fromDate)}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(income)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(expenseTotal)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(cashFlow)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Budget Remaining</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(budgetTotal - expenseTotal)}
          </CardContent>
        </Card>
      </div>

      <div
        className="grid gap-4 xl:grid-cols-2 print:grid-cols-1"
        id="report-print-area"
      >
        <Card>
          <CardHeader>
            <CardTitle>
              {period === "daily" ? "Daily" : "Period"} Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(donations ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No income in period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(donations ?? []).map((row) => (
                    <TableRow key={row.donation_id}>
                      <TableCell>{formatDate(row.donation_date)}</TableCell>
                      <TableCell>
                        {row.donor_name || row.remarks || "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expenses Report</CardTitle>
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
                    <TableHead>Details</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(expenses ?? []).map((row) => (
                    <TableRow key={row.expense_id}>
                      <TableCell>{formatDate(row.expense_date)}</TableCell>
                      <TableCell>{row.description || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Budget Report</CardTitle>
            <CardDescription>
              Allocations and remaining after period expenses.
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
                    <TableHead>Remarks</TableHead>
                    <TableHead className="text-right">Allocated</TableHead>
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
                    return (
                      <TableRow key={row.budget_id}>
                        <TableCell>{row.fiscal_year}</TableCell>
                        <TableCell>{category || "—"}</TableCell>
                        <TableCell className="max-w-[220px] truncate">
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
    </div>
  );
}
