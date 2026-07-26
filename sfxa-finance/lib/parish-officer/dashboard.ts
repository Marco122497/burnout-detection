import { createClient } from "@/lib/supabase/server";
import { toNumber } from "@/lib/format";

export type ParishDashboardStats = {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  totalBudget: number;
  budgetSpent: number;
  remainingBudget: number;
};

export type ParishAnnouncementPreview = {
  announcement_id: number;
  title: string;
  content: string;
  published_at: string | null;
  created_at: string;
};

export async function getParishOfficerDashboardData() {
  const supabase = await createClient();

  const [
    { data: donations },
    { data: expenses },
    { data: budgets },
    { data: announcements },
  ] = await Promise.all([
    supabase.from("donations").select("amount"),
    supabase.from("expenses").select("amount"),
    supabase.from("budgets").select("allocated_amount"),
    supabase
      .from("announcements")
      .select("announcement_id, title, content, published_at, created_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(5),
  ]);

  const totalIncome = (donations ?? []).reduce(
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

  const stats: ParishDashboardStats = {
    totalIncome,
    totalExpenses,
    netBalance: totalIncome - totalExpenses,
    totalBudget,
    budgetSpent: totalExpenses,
    remainingBudget: totalBudget - totalExpenses,
  };

  return {
    stats,
    announcements: (announcements ?? []) as ParishAnnouncementPreview[],
  };
}
