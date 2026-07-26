import { createClient } from "@/lib/supabase/server";
import { toNumber } from "@/lib/format";

export type MonthlyTotal = {
  monthKey: string;
  monthLabel: string;
  total: number;
};

export type CollectionSummaryRow = {
  monthKey: string;
  monthLabel: string;
  categoryName: string;
  total: number;
};

export type BudgetUtilizationRow = {
  categoryName: string;
  fiscalYear: number;
  allocated: number;
  utilized: number;
  remaining: number;
};

export type PublicProject = {
  project_id: number;
  project_name: string | null;
  description: string | null;
  budget: number | string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type PublicAnnouncement = {
  announcement_id: number;
  title: string;
  content: string;
  published_at: string | null;
  created_at: string;
};

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export async function getPublicTransparencyData() {
  const supabase = await createClient();

  const [
    donationsResult,
    collectionsResult,
    budgetResult,
    projectsResult,
    announcementsResult,
  ] = await Promise.all([
    supabase.rpc("public_monthly_donation_totals"),
    supabase.rpc("public_monthly_collection_summary"),
    supabase.rpc("public_budget_utilization"),
    supabase
      .from("parish_projects")
      .select(
        "project_id, project_name, description, budget, status, start_date, end_date"
      )
      .order("start_date", { ascending: false }),
    supabase
      .from("announcements")
      .select("announcement_id, title, content, published_at, created_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(8),
  ]);

  const monthlyDonations: MonthlyTotal[] = (
    (donationsResult.data as { month_key: string; total: number }[] | null) ??
    []
  ).map((row) => ({
    monthKey: row.month_key,
    monthLabel: monthLabel(row.month_key),
    total: toNumber(row.total),
  }));

  const monthlyCollections: CollectionSummaryRow[] = (
    (collectionsResult.data as
      | {
          month_key: string;
          category_name: string;
          total: number;
        }[]
      | null) ?? []
  ).map((row) => ({
    monthKey: row.month_key,
    monthLabel: monthLabel(row.month_key),
    categoryName: row.category_name,
    total: toNumber(row.total),
  }));

  const budgetUtilization: BudgetUtilizationRow[] = (
    (budgetResult.data as
      | {
          category_name: string;
          fiscal_year: number;
          allocated: number;
          utilized: number;
          remaining: number;
        }[]
      | null) ?? []
  ).map((row) => ({
    categoryName: row.category_name,
    fiscalYear: row.fiscal_year,
    allocated: toNumber(row.allocated),
    utilized: toNumber(row.utilized),
    remaining: toNumber(row.remaining),
  }));

  const rpcError =
    donationsResult.error?.message ||
    collectionsResult.error?.message ||
    budgetResult.error?.message ||
    null;

  return {
    monthlyDonations,
    monthlyCollections,
    budgetUtilization,
    projects: (projectsResult.data ?? []) as PublicProject[],
    announcements: (announcementsResult.data ?? []) as PublicAnnouncement[],
    setupRequired: Boolean(rpcError),
    setupMessage: rpcError,
  };
}
