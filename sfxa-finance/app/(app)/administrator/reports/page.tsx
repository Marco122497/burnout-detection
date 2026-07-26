import { requireAdmin } from "@/lib/auth/session";
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

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireAdmin();
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
      supabase.from("budgets").select("allocated_amount"),
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

  const exportRows = [
    ["Type", "Date", "Details", "Amount"],
    ...(donations ?? []).map((row) => [
      "Donation",
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate period reports and export to Excel (CSV) or print/PDF.
          </p>
        </div>
        <ReportExportButtons
          filename={`sfxa-${period}-report`}
          rows={exportRows}
          title={`SFXA ${period} financial report`}
        />
      </div>

      <ReportPeriodSelect period={period} />

      <div className="grid gap-4 sm:grid-cols-3">
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
            <CardTitle>Net / Remaining Budget</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatMoney(income - expenseTotal)} /{" "}
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
            <CardTitle>Income Report</CardTitle>
          </CardHeader>
          <CardContent>
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
                    <TableCell>{row.donor_name || row.remarks || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expense Report</CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
