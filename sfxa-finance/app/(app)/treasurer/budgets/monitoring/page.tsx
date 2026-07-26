import { requireTreasurer } from "@/lib/auth/session";
import { getBudgetModuleData } from "@/lib/treasurer/budget-data";
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

export default async function TreasurerBudgetMonitoringPage() {
  await requireTreasurer();
  const { rows, totals } = await getBudgetModuleData();

  return (
    <div className="space-y-6">
      <BudgetPageHeader
        title="Budget Monitoring"
        description="Track remaining budget and utilization across allocations."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {formatMoney(totals.allocated)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Budget Utilization
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {formatMoney(totals.utilized)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Remaining Budget
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {formatMoney(totals.remaining)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Utilization Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {totals.utilizationPct}%
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utilization by category</CardTitle>
          <CardDescription>
            Spent amounts are matched to budget categories by name.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-3 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${totals.utilizationPct}%` }}
            />
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No budget allocations yet. Add one under Budget Allocation.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Allocated</TableHead>
                  <TableHead className="text-right">Utilized</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.budget_id}>
                    <TableCell>{row.fiscal_year}</TableCell>
                    <TableCell>{row.category_name || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.allocated_amount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.spent)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(row.remaining)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.utilizationPct}%
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
