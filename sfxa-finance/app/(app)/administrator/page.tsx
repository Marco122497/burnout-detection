import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BanknoteIcon,
  PiggyBankIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";

import { requireAdmin } from "@/lib/auth/session";
import { getAdminDashboardData } from "@/lib/admin/dashboard";
import { formatDate, formatMoney } from "@/lib/format";
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

export default async function AdministratorDashboardPage() {
  const { profile } = await requireAdmin();
  const { stats, recentTransactions, monthlySummary } =
    await getAdminDashboardData();

  const cards = [
    {
      title: "Total Income",
      value: formatMoney(stats.totalIncome),
      icon: ArrowUpRightIcon,
    },
    {
      title: "Total Expenses",
      value: formatMoney(stats.totalExpenses),
      icon: ArrowDownRightIcon,
    },
    {
      title: "Total Donations",
      value: formatMoney(stats.totalDonations),
      icon: BanknoteIcon,
    },
    {
      title: "Total Budget",
      value: formatMoney(stats.totalBudget),
      icon: PiggyBankIcon,
    },
    {
      title: "Remaining Budget",
      value: formatMoney(stats.remainingBudget),
      icon: WalletIcon,
    },
    {
      title: "Total Users",
      value: `${stats.totalUsers} (${stats.activeUsers} active)`,
      icon: UsersIcon,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Administrator Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back, {profile.first_name}. Full system overview and
          management tools.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Latest donations and expenses across the parish.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transactions yet. Treasurer entries will appear here.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {tx.label}
                      </TableCell>
                      <TableCell>{formatDate(tx.date)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(tx.amount)}
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
            <CardTitle>Monthly Summary</CardTitle>
            <CardDescription>
              Income vs expenses for recent months.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {monthlySummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No monthly data yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expenses</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlySummary.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell>{row.month}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.income)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.expenses)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
