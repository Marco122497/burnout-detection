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

export default async function ParishIncomeReportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireParishOfficer();
  const params = await searchParams;
  const period = isReportPeriod(params.period) ? params.period : "monthly";
  const fromDate = startOfPeriod(period);
  const supabase = await createClient();

  const { data: donations } = await supabase
    .from("donations")
    .select(
      "donation_id, donor_name, amount, donation_date, remarks, donation_categories(category_name)"
    )
    .gte("donation_date", fromDate)
    .order("donation_date", { ascending: false });

  const total = (donations ?? []).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );

  return (
    <div className="space-y-6">
      <ParishReportPageHeader
        title="Income Report"
        description="Read-only view of parish income for the selected period."
        actions={
          <ReportPeriodSelect
            period={period}
            basePath="/parish-officer/reports/income"
          />
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Income</CardTitle>
          <CardDescription>
            From {formatDate(fromDate)} · Total {formatMoney(total)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(donations ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No income in period.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(donations ?? []).map((row) => {
                  const category = Array.isArray(row.donation_categories)
                    ? row.donation_categories[0]?.category_name
                    : (
                        row.donation_categories as {
                          category_name?: string;
                        } | null
                      )?.category_name;
                  return (
                    <TableRow key={row.donation_id}>
                      <TableCell>{formatDate(row.donation_date)}</TableCell>
                      <TableCell>{row.donor_name || "—"}</TableCell>
                      <TableCell>{category || "—"}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {row.remarks || "—"}
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
