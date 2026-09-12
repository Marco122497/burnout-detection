import { callBurnoutAiRecommendation } from "@/lib/student/ai-client";
import type { createClient } from "@/lib/supabase/server";
import {
  getLatestRagRecommendation,
  unwrapMfbi,
  type MonitoringRow,
} from "@/lib/student/queries";
import {
  saveRagRecommendation,
  type StoredRagRecommendation,
} from "@/lib/student/rag";

type SupabaseLike = Awaited<ReturnType<typeof createClient>>;

function isStaleRagRecommendation(existing: StoredRagRecommendation): boolean {
  const actions = existing.recommended_actions ?? [];
  const actionText = actions.join("\n");
  const mentionsSleepNeed =
    /sleep looks like the hardest|not be getting enough rest|rest is a bit off/i.test(
      existing.assessment_summary
    ) ||
    existing.contributing_factors.some((item) =>
      /sleep looks like the hardest|enough rest|rest is a bit off/i.test(item)
    );
  const actionCoversSleep =
    /sleep|bedtime|7 hours|wake time|caffeine|through the night/i.test(
      actionText
    );
  const deadlineDupes = actions.filter((item) =>
    /deadline or class/i.test(item)
  ).length;

  const extraUnfocusedTips =
    /due dates in one simple list|shorter focused blocks with a clear goal/i.test(
      actionText
    ) &&
    !/classwork|schoolwork load|studying quite|Study hours|Study time looks/i.test(
      existing.contributing_factors.join("\n")
    );
  const sleepNotFirst =
    /sleep looks like the hardest/i.test(existing.assessment_summary) &&
    actions.length > 0 &&
    !/sleep|bedtime|7 hours/i.test(actions[0] ?? "");

  return (
    existing.assessment_summary.includes("classified as") ||
    existing.human_support.includes("verified student support directory") ||
    existing.contributing_factors.some((item) =>
      /sleep-related risk|Moderate stress|High study time/i.test(item)
    ) ||
    deadlineDupes >= 2 ||
    (mentionsSleepNeed && !actionCoversSleep) ||
    extraUnfocusedTips ||
    sleepNotFirst
  );
}

/**
 * Load a stored RAG recommendation, or generate one for this monitoring row.
 * Lets students see RAG advice without re-submitting weekly monitoring.
 */
export async function ensureRagRecommendation(
  supabase: SupabaseLike,
  studentId: string,
  latest: MonitoringRow | null
): Promise<StoredRagRecommendation | null> {
  if (!latest) return null;

  const existing = await getLatestRagRecommendation(
    supabase,
    studentId,
    latest.monitoring_id
  );
  const stale = existing ? isStaleRagRecommendation(existing) : false;
  if (existing && existing.llm_model && !existing.used_fallback && !stale) {
    return existing;
  }

  const mfbi = unwrapMfbi(latest);
  const mfbiScore = mfbi?.mfbi_score;
  if (!mfbi || mfbiScore == null) return existing;

  const result = await callBurnoutAiRecommendation({
    studentId,
    monitoringId: latest.monitoring_id,
    mfbiId: mfbi.mfbi_id ?? null,
    stressScore: latest.stress_score,
    academicWorkloadScore: latest.academic_workload,
    studyTimeScore: latest.study_time,
    sleepHoursScore: latest.sleep_hours,
    mfbiScore: Number(mfbiScore),
    riskLevel:
      latest.prediction?.final_prediction ?? mfbi.burnout_level ?? "Moderate",
    predictionModel: latest.prediction?.selected_model ?? "Random Forest",
  });

  if (!result) return existing;

  try {
    await saveRagRecommendation(supabase, {
      studentId,
      monitoringId: latest.monitoring_id,
      mfbiId: mfbi.mfbi_id ?? null,
      result,
    });
  } catch (error) {
    console.error("ensureRagRecommendation save skipped:", error);
  }

  return getLatestRagRecommendation(supabase, studentId, latest.monitoring_id);
}
