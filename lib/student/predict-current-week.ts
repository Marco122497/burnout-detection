import type { createClient } from "@/lib/supabase/server";

import {
  earlyWarningWasUnreachable,
  resetEarlyWarningReachability,
  warmBurnoutAi,
} from "@/lib/student/ai-client";
import { ensureLatestEarlyWarning } from "@/lib/student/ensure-early-warning";
import { getWeeklyMonitoringHistory } from "@/lib/student/queries";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";
import { fetchAllPages } from "@/lib/supabase/fetch-all";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type CurrentWeekPredictionRun = {
  week: number | null;
  submitted: number;
  updated: number;
  skipped: number;
  failed: number;
  offline: boolean;
};

const PREDICT_CONCURRENCY = 4;

async function mapPool<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
) {
  if (!items.length) return;
  let index = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (index < items.length) {
        const current = items[index];
        index += 1;
        await fn(current);
      }
    }
  );
  await Promise.all(workers);
}

/**
 * Run the same next-week forecast the student dashboard uses, for every
 * student who already submitted the current monitoring week.
 */
export async function predictSubmittedCurrentWeek(
  supabase: SupabaseClient,
  options?: { studentIds?: string[]; weekNumber?: number }
): Promise<CurrentWeekPredictionRun> {
  const empty: CurrentWeekPredictionRun = {
    week: null,
    submitted: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    offline: false,
  };

  const term = await getActiveTerm(supabase);
  if (!term?.term_id) return empty;

  const requestedWeek =
    options?.weekNumber != null ? Math.floor(options.weekNumber) : null;
  if (
    requestedWeek != null &&
    requestedWeek !== 1 &&
    requestedWeek !== 2 &&
    requestedWeek !== 3
  ) {
    return empty;
  }
  const week = requestedWeek ?? getCurrentWeekNumber(term);
  if (week < 1) return empty;
  const allowed = options?.studentIds ? new Set(options.studentIds) : null;
  const rows = await fetchAllPages<{ student_id: string }>(async (from, to) =>
    supabase
      .from("weekly_monitoring")
      .select("student_id")
      .eq("term_id", term.term_id)
      .eq("week_number", week)
      .order("student_id", { ascending: true })
      .range(from, to)
  );

  const studentIds = [
    ...new Set(
      rows
        .map((row) => row.student_id)
        .filter((id) => (allowed ? allowed.has(id) : true))
    ),
  ];

  const result: CurrentWeekPredictionRun = {
    ...empty,
    week,
    submitted: studentIds.length,
  };
  if (!studentIds.length) return result;

  const online = await warmBurnoutAi();
  if (!online) {
    result.offline = true;
    return result;
  }

  resetEarlyWarningReachability();
  let stop = false;

  await mapPool(studentIds, PREDICT_CONCURRENCY, async (studentId) => {
    if (stop) return;
    try {
      const history = await getWeeklyMonitoringHistory(supabase, studentId);
      const target = history.find((row) => row.week_number === week);
      if (!target) {
        result.skipped += 1;
        return;
      }
      const status = await ensureLatestEarlyWarning(studentId, history, {
        assumeOnline: true,
        weekNumber: week,
      });
      if (status === "updated") result.updated += 1;
      else if (status === "failed" || status === "offline") {
        result.failed += 1;
        if (status === "offline" || earlyWarningWasUnreachable()) {
          result.offline = true;
          stop = true;
        }
      } else result.skipped += 1;
    } catch (error) {
      console.error("predictSubmittedCurrentWeek:", studentId, error);
      result.failed += 1;
      if (
        error instanceof TypeError &&
        /fetch/i.test(error.message)
      ) {
        result.offline = true;
        stop = true;
      }
    }
  });

  return result;
}
