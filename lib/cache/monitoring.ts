import { cache } from "react";
import { unstable_cache } from "next/cache";

import type { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPages } from "@/lib/supabase/fetch-all";
import { classifyMfbiScore } from "@/lib/student/mfbi";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type WeeklySeriesPoint = {
  week: number;
  average: number;
  count: number;
  lowCount: number;
  moderateCount: number;
  highCount: number;
};

function riskBucket(level: string | null | undefined): "Low" | "Moderate" | "High" | null {
  if (!level) return null;
  if (level === "Low") return "Low";
  if (level === "Moderate") return "Moderate";
  if (level === "High" || level === "Severe") return "High";
  return null;
}

function aggregateWeeklyRows(
  rows: Array<{
    week_number: number | null;
    mfbi_results:
      | { mfbi_score?: number | null; burnout_risk_level?: string | null }
      | { mfbi_score?: number | null; burnout_risk_level?: string | null }[]
      | null;
  }>
): WeeklySeriesPoint[] {
  const weeklyMap = new Map<
    number,
    { scores: number[]; low: number; moderate: number; high: number }
  >();

  for (const row of rows) {
    const mfbi = Array.isArray(row.mfbi_results)
      ? row.mfbi_results[0]
      : row.mfbi_results;
    if (row.week_number == null) continue;

    const entry = weeklyMap.get(row.week_number) ?? {
      scores: [],
      low: 0,
      moderate: 0,
      high: 0,
    };

    if (mfbi?.mfbi_score != null) {
      entry.scores.push(Number(mfbi.mfbi_score));
    }

    const bucket =
      mfbi?.mfbi_score != null
        ? classifyMfbiScore(Number(mfbi.mfbi_score))
        : riskBucket(mfbi?.burnout_risk_level ?? null);
    if (bucket === "Low") entry.low += 1;
    else if (bucket === "Moderate") entry.moderate += 1;
    else if (bucket === "High") entry.high += 1;

    weeklyMap.set(row.week_number, entry);
  }

  return [...weeklyMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, entry]) => ({
      week,
      average: entry.scores.length
        ? entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
        : 0,
      count: entry.scores.length,
      lowCount: entry.low,
      moderateCount: entry.moderate,
      highCount: entry.high,
    }));
}

async function loadUniversityWeeklySeries(termId: number): Promise<WeeklySeriesPoint[]> {
  const admin = createAdminClient();
  const rows = await fetchAllPages(async (from, to) =>
    admin
      .from("weekly_monitoring")
      .select("week_number, mfbi_results(mfbi_score, burnout_risk_level)")
      .eq("term_id", termId)
      .order("week_number", { ascending: true })
      .range(from, to)
  );
  return aggregateWeeklyRows(rows);
}

const getCachedUniversityWeeklySeriesByTerm = unstable_cache(
  loadUniversityWeeklySeries,
  ["university-weekly-series-v1"],
  { revalidate: 60 }
);

/** Cross-request cached university weekly risk series (60s). */
export async function getCachedUniversityWeeklySeries(
  supabase: SupabaseClient
): Promise<WeeklySeriesPoint[]> {
  const { getActiveTerm } = await import("@/lib/student/terms");
  const term = await getActiveTerm(supabase);
  if (!term?.term_id) return [];

  try {
    return await getCachedUniversityWeeklySeriesByTerm(term.term_id);
  } catch {
    // Fall back to the caller's RLS client if service role is unavailable.
    const rows = await fetchAllPages(async (from, to) =>
      supabase
        .from("weekly_monitoring")
        .select("week_number, mfbi_results(mfbi_score, burnout_risk_level)")
        .eq("term_id", term.term_id)
        .order("week_number", { ascending: true })
        .range(from, to)
    );
    return aggregateWeeklyRows(rows);
  }
}

async function loadDepartmentWeeklySeries(
  termId: number,
  departmentId: number
): Promise<WeeklySeriesPoint[]> {
  const admin = createAdminClient();
  const students = await fetchAllPages(async (from, to) =>
    admin
      .from("profiles")
      .select("id")
      .eq("role", "Student")
      .eq("is_active", true)
      .eq("department_id", departmentId)
      .range(from, to)
  );
  const ids = students.map((s) => s.id);
  if (!ids.length) return [];

  const rows: Array<{
    week_number: number | null;
    mfbi_results:
      | { mfbi_score?: number | null; burnout_risk_level?: string | null }
      | { mfbi_score?: number | null; burnout_risk_level?: string | null }[]
      | null;
  }> = [];

  const chunkSize = 200;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const chunkRows = await fetchAllPages(async (from, to) =>
      admin
        .from("weekly_monitoring")
        .select("week_number, mfbi_results(mfbi_score, burnout_risk_level)")
        .eq("term_id", termId)
        .in("student_id", chunk)
        .order("week_number", { ascending: true })
        .range(from, to)
    );
    rows.push(...chunkRows);
  }

  return aggregateWeeklyRows(rows);
}

const getCachedDepartmentWeeklySeriesByKey = unstable_cache(
  async (termId: number, departmentId: number) =>
    loadDepartmentWeeklySeries(termId, departmentId),
  ["department-weekly-series-v1"],
  { revalidate: 60 }
);

/** Cross-request cached department weekly risk series (60s). */
export async function getCachedDepartmentWeeklySeries(
  supabase: SupabaseClient,
  departmentId: number | null
): Promise<WeeklySeriesPoint[]> {
  if (!departmentId) return [];
  const { getActiveTerm } = await import("@/lib/student/terms");
  const term = await getActiveTerm(supabase);
  if (!term?.term_id) return [];

  try {
    return await getCachedDepartmentWeeklySeriesByKey(
      term.term_id,
      departmentId
    );
  } catch {
    return [];
  }
}

/** Chunked `.in()` helper for large id lists (PostgREST / URL limits). */
export async function fetchInChunks<T>(
  ids: number[] | string[],
  chunkSize: number,
  fetchChunk: (chunk: (number | string)[]) => PromiseLike<{ data: T[] | null }>
): Promise<T[]> {
  if (!ids.length) return [];
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const { data } = await fetchChunk(chunk);
    if (data?.length) out.push(...data);
  }
  return out;
}

/**
 * Request-scoped wrappers — same page calling a loader twice hits DB once.
 */
export function withRequestCache<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>
) {
  return cache(fn);
}
