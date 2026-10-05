import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBurnoutAiOnline,
  parseEarlyWarningRemarks,
} from "@/lib/student/ai-client";
import {
  FIRST_WEEK_BASELINE_LEVEL,
  FIRST_WEEK_BASELINE_MFBI,
  FIRST_WEEK_BASELINE_PRIOR,
} from "@/lib/student/first-week-baseline";
import type { BurnoutLevel, MfbiResult } from "@/lib/student/mfbi";
import type { MonitoringRow } from "@/lib/student/queries";
import { predictBurnoutRiskWithAi } from "@/lib/student/predict";
import type { SectionScores } from "@/lib/student/scoring";

function unwrapMfbi(row: MonitoringRow) {
  const mfbi = row.mfbi_results;
  if (!mfbi) return null;
  return Array.isArray(mfbi) ? mfbi[0] ?? null : mfbi;
}

function stressLevel(score: number): SectionScores["stress_level"] {
  if (score >= 27) return "High";
  if (score >= 14) return "Moderate";
  return "Low";
}

/**
 * Week rows saved while the AI was asleep have MFBI and recommendations, but
 * no next-week or week-2 forecast. Fill that forecast once the service is up.
 */
export async function ensureLatestEarlyWarning(
  studentId: string,
  history: MonitoringRow[]
) {
  try {
    await fillLatestEarlyWarning(studentId, history);
  } catch (error) {
    console.error("ensureLatestEarlyWarning:", error);
  }
}

async function fillLatestEarlyWarning(
  studentId: string,
  history: MonitoringRow[]
) {
  const latest = history[0];
  if (!latest?.prediction) return;

  const existing = parseEarlyWarningRemarks(latest.prediction.remarks);
  if (existing?.has_ml_next_week) return;

  const mfbi = unwrapMfbi(latest);
  if (!mfbi?.mfbi_id) return;

  const online = await getBurnoutAiOnline();
  if (!online) return;

  const older = [...history].slice(1).reverse();
  const historyLevels: string[] = [];
  const historyMfbi: number[] = [];

  for (const row of older) {
    const prior = unwrapMfbi(row);
    if (prior?.burnout_level) historyLevels.push(String(prior.burnout_level));
    if (prior?.mfbi_score != null) historyMfbi.push(Number(prior.mfbi_score));
  }

  const previous = older.length > 0 ? older[older.length - 1] : null;
  const priorWeek = previous
    ? {
        stress_score: Number(previous.stress_score),
        academic_workload_score: Number(previous.academic_workload),
        study_time_score: Number(previous.study_time),
        sleep_hours_score: Number(previous.sleep_hours),
      }
    : FIRST_WEEK_BASELINE_PRIOR;

  if (!previous) {
    historyLevels.push(FIRST_WEEK_BASELINE_LEVEL);
    historyMfbi.push(FIRST_WEEK_BASELINE_MFBI);
  }

  historyLevels.push(String(mfbi.burnout_level));
  historyMfbi.push(Number(mfbi.mfbi_score));

  const mfbiResult: MfbiResult = {
    mfbi_score: Number(mfbi.mfbi_score),
    burnout_risk_level: String(mfbi.burnout_level) as BurnoutLevel,
    normalized_stress: Number(mfbi.normalized_stress),
    normalized_academic_workload: Number(mfbi.normalized_workload),
    normalized_study_time: Number(mfbi.normalized_study_time),
    normalized_sleep_hours: Number(mfbi.normalized_sleep),
  };

  const sections: SectionScores = {
    stress_score: Number(latest.stress_score),
    stress_level: stressLevel(Number(latest.stress_score)),
    academic_workload_score: Number(latest.academic_workload),
    study_time_score: Number(latest.study_time),
    sleep_hours_score: Number(latest.sleep_hours),
  };

  const prediction = await predictBurnoutRiskWithAi(mfbiResult, sections, {
    studentId,
    priorWeek,
    historyLevels,
    historyMfbi,
  });

  const refreshed = parseEarlyWarningRemarks(prediction.remarks);
  if (!refreshed?.has_ml_next_week) return;

  try {
    const admin = createAdminClient();
    const { data: row, error: lookupError } = await admin
      .from("ml_predictions")
      .select("prediction_id")
      .eq("mfbi_id", mfbi.mfbi_id)
      .order("prediction_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError || !row?.prediction_id) {
      console.error("ensureLatestEarlyWarning lookup:", lookupError?.message);
      return;
    }

    const { error: updateError } = await admin
      .from("ml_predictions")
      .update({
        final_prediction: prediction.final_prediction,
        selected_model: prediction.selected_model,
        decision_tree_prediction: prediction.decision_tree_prediction,
        random_forest_prediction: prediction.random_forest_prediction,
        decision_tree_confidence: prediction.decision_tree_confidence,
        random_forest_confidence: prediction.random_forest_confidence,
        model_version: prediction.model_version,
        remarks: prediction.remarks,
      })
      .eq("prediction_id", row.prediction_id);

    if (updateError) {
      console.error("ensureLatestEarlyWarning update:", updateError.message);
      return;
    }
  } catch (error) {
    console.error("ensureLatestEarlyWarning:", error);
    return;
  }

  latest.prediction = {
    ...latest.prediction,
    final_prediction: prediction.final_prediction,
    selected_model: prediction.selected_model,
    decision_tree_prediction: prediction.decision_tree_prediction,
    random_forest_prediction: prediction.random_forest_prediction,
    decision_tree_confidence: prediction.decision_tree_confidence,
    random_forest_confidence: prediction.random_forest_confidence,
    model_version: prediction.model_version,
    remarks: prediction.remarks,
  };
}
