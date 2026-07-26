import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isCollectionCategoryName } from "@/lib/categories";
import { formatDate, formatMoney, toNumber } from "@/lib/format";
import { relationName } from "@/lib/treasurer/relations";
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

export default async function AdminDonationsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("donations")
    .select(
      "donation_id, donor_name, amount, donation_date, remarks, donation_categories(category_name)"
    )
    .order("donation_date", { ascending: false })
    .limit(200);

  const rows = (data ?? []).filter((row) => {
    const category = relationName(
      row.donation_categories as
        | { category_name?: string }
        | { category_name?: string }[]
        | null
    );
    return !isCollectionCategoryName(category);
  });
  const total = rows.reduce((sum, row) => sum + toNumber(row.amount), 0);

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Donations"
        description="View donation records (excluding parish collections)."
      />
      <Card>
        <CardHeader>
          <CardTitle>Donation records</CardTitle>
          <CardDescription>
            Total shown: {formatMoney(total)} · Read-only monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No donations yet. Treasurer entries will appear here.
            </p>
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
                {rows.map((row) => {
                  const category = relationName(
                    row.donation_categories as
                      | { category_name?: string }
                      | { category_name?: string }[]
                      | null
                  );
                  return (
                    <TableRow key={row.donation_id}>
                      <TableCell>{formatDate(row.donation_date)}</TableCell>
                      <TableCell>{row.donor_name || "—"}</TableCell>
                      <TableCell>{category || "—"}</TableCell>
                      <TableCell className="max-w-[220px] truncate">
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
