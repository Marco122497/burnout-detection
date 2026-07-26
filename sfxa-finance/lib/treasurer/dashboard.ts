import { createClient } from "@/lib/supabase/server";
import { toNumber } from "@/lib/format";

export type TreasurerDashboardStats = {
  todaysCollection: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  remainingBudget: number;
};

export type TreasurerTransaction = {
  id: string;
  type: "Donation" | "Expense";
  label: string;
  amount: number;
  date: string;
};

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function getTreasurerDashboardData() {
  const supabase = await createClient();
  const today = todayKey();
  const fromMonth = monthStart();

  const [
    { data: todayDonations },
    { data: monthDonations },
    { data: monthExpenses },
    { data: budgets },
    { data: allExpenses },
    { data: recentDonations },
    { data: recentExpenses },
  ] = await Promise.all([
    supabase
      .from("donations")
      .select("amount")
      .eq("donation_date", today),
    supabase
      .from("donations")
      .select("amount")
      .gte("donation_date", fromMonth),
    supabase
      .from("expenses")
      .select("amount")
      .gte("expense_date", fromMonth),
    supabase.from("budgets").select("allocated_amount"),
    supabase.from("expenses").select("amount"),
    supabase
      .from("donations")
      .select("donation_id, donor_name, amount, donation_date")
      .order("donation_date", { ascending: false })
      .limit(8),
    supabase
      .from("expenses")
      .select("expense_id, description, amount, expense_date")
      .order("expense_date", { ascending: false })
      .limit(8),
  ]);

  const todaysCollection = (todayDonations ?? []).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );
  const monthlyIncome = (monthDonations ?? []).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );
  const monthlyExpenses = (monthExpenses ?? []).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );
  const totalBudget = (budgets ?? []).reduce(
    (sum, row) => sum + toNumber(row.allocated_amount),
    0
  );
  const totalExpenses = (allExpenses ?? []).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0
  );

  const stats: TreasurerDashboardStats = {
    todaysCollection,
    monthlyIncome,
    monthlyExpenses,
    remainingBudget: totalBudget - totalExpenses,
  };

  const recentTransactions: TreasurerTransaction[] = [
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

  return { stats, recentTransactions };
}
