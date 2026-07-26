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

export default async function AdminCollectionsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: categories }, { data: donations }] = await Promise.all([
    supabase
      .from("donation_categories")
      .select("category_id, category_name")
      .order("category_name"),
    supabase
      .from("donations")
      .select(
        "donation_id, donor_name, amount, donation_date, remarks, category_id, donation_categories(category_name)"
      )
      .order("donation_date", { ascending: false })
      .limit(200),
  ]);

  const collectionCategories = (categories ?? []).filter((row) =>
    isCollectionCategoryName(row.category_name)
  );
  const collectionIds = new Set(
    collectionCategories.map((row) => row.category_id)
  );

  const summary = collectionCategories.map((category) => ({
    ...category,
    total: (donations ?? [])
      .filter((row) => row.category_id === category.category_id)
      .reduce((sum, row) => sum + toNumber(row.amount), 0),
  }));

  const rows = (donations ?? []).filter(
    (row) => row.category_id != null && collectionIds.has(row.category_id)
  );
  const total = rows.reduce((sum, row) => sum + toNumber(row.amount), 0);

  return (
    <div className="space-y-6">
      <FinancePageHeader
        title="Collections"
        description="View parish collection records and totals by type."
      />

      <Card>
        <CardHeader>
          <CardTitle>Collection summary</CardTitle>
          <CardDescription>
            Totals by collection type (read-only).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No collection types found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Collection type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((row) => (
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

      <Card>
        <CardHeader>
          <CardTitle>Collection records</CardTitle>
          <CardDescription>
            Total shown: {formatMoney(total)} · Read-only monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No collections yet. Treasurer entries will appear here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Donor</TableHead>
                  <TableHead>Type</TableHead>
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
