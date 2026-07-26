import { createAdminClient } from "@/lib/supabase/admin";
import { toNumber } from "@/lib/format";

export type AdminDashboardStats = {
  totalIncome: number;
  totalExpenses: number;
  totalDonations: number;
  totalBudget: number;
  remainingBudget: number;
  totalUsers: number;
  activeUsers: number;
};

export type RecentTransaction = {
  id: string;
  type: "Donation" | "Expense";
  label: string;
  amount: number;
  date: string;
};

export type MonthlySummaryRow = {
  month: string;
  income: number;
  expenses: number;
};

function monthKey(date: string) {
  return date.slice(0, 7);
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export async function getAdminDashboardData() {
  const admin = createAdminClient();

  const [
    { data: donations },
    { data: expenses },
    { data: budgets },
    { count: totalUsers },
    { count: activeUsers },
    { data: recentDonations },
    { data: recentExpenses },
  ] = await Promise.all([
    admin.from("donations").select("amount, donation_date"),
    admin.from("expenses").select("amount, expense_date"),
    admin.from("budgets").select("allocated_amount"),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("status", true),
    admin
      .from("donations")
      .select("donation_id, donor_name, amount, donation_date")
      .order("donation_date", { ascending: false })
      .limit(8),
    admin
      .from("expenses")
      .select("expense_id, description, amount, expense_date")
      .order("expense_date", { ascending: false })
      .limit(8),
  ]);

  const totalDonations = (donations ?? []).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );
  const totalExpenses = (expenses ?? []).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );
  const totalBudget = (budgets ?? []).reduce(
    (sum, row) => sum + toNumber(row.allocated_amount),
    0
  );
  const totalIncome = totalDonations;
  const remainingBudget = totalBudget - totalExpenses;

  const stats: AdminDashboardStats = {
    totalIncome,
    totalExpenses,
    totalDonations,
    totalBudget,
    remainingBudget,
    totalUsers: totalUsers ?? 0,
    activeUsers: activeUsers ?? 0,
  };

  const recentTransactions: RecentTransaction[] = [
    ...(recentDonations ?? []).map((row) => ({
      id: `d-${row.donation_id}`,
      type: "Donation" as const,
      label: row.donor_name || "Donation",
      amount: toNumber(row.amount),
      date: row.donation_date as string,
    })),
    ...(recentExpenses ?? []).map((row) => ({
      id: `e-${row.expense_id}`,
      type: "Expense" as const,
      label: row.description || "Expense",
      amount: toNumber(row.amount),
      date: row.expense_date as string,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const monthMap = new Map<string, { income: number; expenses: number }>();
  for (const row of donations ?? []) {
    const key = monthKey(String(row.donation_date));
    const current = monthMap.get(key) ?? { income: 0, expenses: 0 };
    current.income += toNumber(row.amount);
    monthMap.set(key, current);
  }
  for (const row of expenses ?? []) {
    const key = monthKey(String(row.expense_date));
    const current = monthMap.get(key) ?? { income: 0, expenses: 0 };
    current.expenses += toNumber(row.amount);
    monthMap.set(key, current);
  }

  const monthlySummary: MonthlySummaryRow[] = [...monthMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([key, value]) => ({
      month: monthLabel(key),
      income: value.income,
      expenses: value.expenses,
    }));

  return {
    stats,
    recentTransactions,
    monthlySummary,
  };
}
