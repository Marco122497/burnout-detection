import { requireParishOfficer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, toNumber } from "@/lib/format";
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

export default async function ParishCollectionsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireParishOfficer();
  const params = await searchParams;
  const period = isReportPeriod(params.period) ? params.period : "monthly";
  const fromDate = startOfPeriod(period);
  const supabase = await createClient();

  const [{ data: categories }, { data: donations }] = await Promise.all([
    supabase
      .from("donation_categories")
      .select("category_id, category_name")
      .order("category_name"),
    supabase
      .from("donations")
      .select("amount, category_id")
      .gte("donation_date", fromDate),
  ]);

  const totals = new Map<number, number>();
  let grandTotal = 0;
  for (const row of donations ?? []) {
    if (row.category_id == null) continue;
    const amount = toNumber(row.amount);
    totals.set(row.category_id, (totals.get(row.category_id) ?? 0) + amount);
    grandTotal += amount;
  }

  const rows = (categories ?? []).map((category) => ({
    ...category,
    total: totals.get(category.category_id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <ParishReportPageHeader
        title="Collection Summary"
        description="Read-only collection totals by category for the selected period."
        actions={
          <ReportPeriodSelect
            period={period}
            basePath="/parish-officer/reports/collections"
          />
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Collections by category</CardTitle>
          <CardDescription>Period total: {formatMoney(grandTotal)}</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No collection categories yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.category_id}>
                    <TableCell>{row.category_name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
