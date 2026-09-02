import type { createClient } from "@/lib/supabase/server";
import type { BurnoutLevel } from "@/lib/student/mfbi";
import { resolveMfbiBurnoutLevel } from "@/lib/student/mfbi";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type BurnoutTrendPoint = {
  week: number;
  score: number;
  level: string;
  delta: number | null;
  direction: string;
  recordedAt: string | null;
};

export function classifyTrendDirection(
  current: number,
  previous: number | null
): "insufficient_history" | "increasing" | "decreasing" | "stable" {
  if (previous == null) return "insufficient_history";
  const delta = current - previous;
  if (delta >= 0.08) return "increasing";
  if (delta <= -0.08) return "decreasing";
  return "stable";
}

/**
 * Persist one trend snapshot per weekly submission.
 * Safe no-op if the phase7 table is not migrated yet.
 */
export async function saveBurnoutTrend(
  supabase: SupabaseClient,
  input: {
    studentId: string;
    termId: number;
    weekNumber: number;
    monitoringId: number;
    mfbiScore: number;
    riskLevel: BurnoutLevel | string;
    previousMfbiScore: number | null;
  }
) {
  const direction = classifyTrendDirection(
    input.mfbiScore,
    input.previousMfbiScore
  );
  const mfbi_delta =
    input.previousMfbiScore == null
      ? null
      : Math.round((input.mfbiScore - input.previousMfbiScore) * 10000) / 10000;

  const { error } = await supabase.from("burnout_trends").upsert(
    {
      student_id: input.studentId,
      term_id: input.termId,
      week_number: input.weekNumber,
      monitoring_id: input.monitoringId,
      mfbi_score: input.mfbiScore,
      risk_level: input.riskLevel,
      previous_mfbi_score: input.previousMfbiScore,
      mfbi_delta,
      trend_direction: direction,
    },
    { onConflict: "student_id,term_id,week_number" }
  );

  if (error) {
    console.error("saveBurnoutTrend:", error.message);
    return { direction, mfbi_delta, saved: false as const };
  }

  return { direction, mfbi_delta, saved: true as const };
}

export async function getStudentBurnoutTrends(
  supabase: SupabaseClient,
  studentId: string,
  termId?: number | null
): Promise<BurnoutTrendPoint[]> {
  let query = supabase
    .from("burnout_trends")
    .select(
      "week_number, mfbi_score, risk_level, mfbi_delta, trend_direction, created_at"
    )
    .eq("student_id", studentId)
    .order("week_number", { ascending: true });

  if (termId) {
    query = query.eq("term_id", termId);
  }

  const { data, error } = await query;
  if (error || !data?.length) {
    return [];
  }

  return data.map((row) => {
    const score = Number(row.mfbi_score);
    return {
      week: Number(row.week_number),
      score,
      level:
        resolveMfbiBurnoutLevel(score, row.risk_level) ??
        String(row.risk_level),
      delta: row.mfbi_delta != null ? Number(row.mfbi_delta) : null,
      direction: String(row.trend_direction),
      recordedAt: row.created_at ?? null,
    };
  });
}

/** Backfill trend rows from existing MFBI history (idempotent). */
export async function backfillBurnoutTrendsFromHistory(
  supabase: SupabaseClient,
  studentId: string,
  termId: number
) {
  const { data: rows, error } = await supabase
    .from("weekly_monitoring")
    .select(
      "monitoring_id, week_number, mfbi_results(mfbi_score, burnout_risk_level)"
    )
    .eq("student_id", studentId)
    .eq("term_id", termId)
    .order("week_number", { ascending: true });

  if (error || !rows?.length) return 0;

  let previous: number | null = null;
  let saved = 0;

  for (const row of rows) {
    const mfbiRaw = row.mfbi_results;
    const mfbi = Array.isArray(mfbiRaw) ? mfbiRaw[0] : mfbiRaw;
    if (mfbi?.mfbi_score == null) continue;

    const score = Number(mfbi.mfbi_score);
    const result = await saveBurnoutTrend(supabase, {
      studentId,
      termId,
      weekNumber: Number(row.week_number),
      monitoringId: Number(row.monitoring_id),
      mfbiScore: score,
      riskLevel: mfbi.burnout_risk_level ?? "Moderate",
      previousMfbiScore: previous,
    });
    if (result.saved) saved += 1;
    previous = score;
  }

  return saved;
}
