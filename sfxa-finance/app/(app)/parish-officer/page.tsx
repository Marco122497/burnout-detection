import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  WalletIcon,
} from "lucide-react";

import { requireParishOfficer } from "@/lib/auth/session";
import { getParishOfficerDashboardData } from "@/lib/parish-officer/dashboard";
import { formatDateTime } from "@/lib/auth/roles";
import { formatMoney } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function ParishOfficerDashboardPage() {
  const { profile } = await requireParishOfficer();
  const { stats, announcements } = await getParishOfficerDashboardData();

  const financialCards = [
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
      title: "Net Balance",
      value: formatMoney(stats.netBalance),
      icon: WalletIcon,
    },
  ];

  const budgetCards = [
    {
      title: "Allocated Budget",
      value: formatMoney(stats.totalBudget),
    },
    {
      title: "Budget Utilized",
      value: formatMoney(stats.budgetSpent),
    },
    {
      title: "Remaining Budget",
      value: formatMoney(stats.remainingBudget),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Parish Officer Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back, {profile.first_name}. Read-only overview of parish
          finances and announcements.
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Financial Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {financialCards.map((card) => (
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
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Budget Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {budgetCards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight">
                  {card.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Announcements</CardTitle>
          <CardDescription>
            Latest published parish announcements.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published announcements yet.
            </p>
          ) : (
            announcements.map((item) => (
              <div
                key={item.announcement_id}
                className="border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(item.published_at || item.created_at)}
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                  {item.content}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
