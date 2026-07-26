import { requireTreasurer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/auth/roles";
import { formatMoney } from "@/lib/format";
import { BudgetPageHeader } from "@/components/treasurer/budget-page-header";
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

export default async function TreasurerBudgetHistoryPage() {
  await requireTreasurer();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budget_history")
    .select(
      "history_id, budget_id, category_name, fiscal_year, previous_amount, new_amount, action, remarks, changed_at, profiles(full_name)"
    )
    .order("changed_at", { ascending: false })
    .limit(100);

  const rows = data ?? [];

  return (
    <div className="space-y-6">
      <BudgetPageHeader
        title="Budget History"
        description="Audit trail of budget create, update, and delete actions."
      />

      <Card>
        <CardHeader>
          <CardTitle>Change history</CardTitle>
          <CardDescription>
            {error
              ? "History table is not available yet. Run sql/phase6-budget.sql in Supabase."
              : "Most recent budget changes across the parish."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-muted-foreground">{error.message}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No budget history yet. Allocations you create or update will
              appear here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Previous</TableHead>
                  <TableHead className="text-right">New</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const changedBy = Array.isArray(row.profiles)
                    ? row.profiles[0]?.full_name
                    : (row.profiles as { full_name?: string } | null)?.full_name;
                  return (
                    <TableRow key={row.history_id}>
                      <TableCell>{formatDateTime(row.changed_at)}</TableCell>
                      <TableCell>{row.action}</TableCell>
                      <TableCell>{row.category_name || "—"}</TableCell>
                      <TableCell>{row.fiscal_year ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.previous_amount == null
                          ? "—"
                          : formatMoney(row.previous_amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.new_amount == null
                          ? "—"
                          : formatMoney(row.new_amount)}
                      </TableCell>
                      <TableCell>{changedBy || "—"}</TableCell>
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
