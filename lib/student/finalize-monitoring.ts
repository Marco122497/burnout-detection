import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { buildFullName } from "@/lib/auth/roles";
import type { Profile } from "@/lib/auth/roles";
import {
  classifyMfbiScore,
  computeMfbi,
  resolveMfbiBurnoutLevel,
  type BurnoutLevel,
  type MfbiResult,
} from "@/lib/student/mfbi";
import { saveBurnoutTrend } from "@/lib/student/burnout-trends";
import {
  FIRST_WEEK_BASELINE_LEVEL,
  FIRST_WEEK_BASELINE_MFBI,
  FIRST_WEEK_BASELINE_PRIOR,
  predictBurnoutRiskWithAi,
} from "@/lib/student/predict";
import { ensureRagRecommendation } from "@/lib/student/ensure-rag";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";
import { formatYearLevel } from "@/lib/utils";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const FACTOR_LABELS = {
  stress: "Stress Level",
  workload: "Academic Workload",
  studyTime: "Study Time",
  sleep: "Sleep Hours",
} as const;

function highMfbiFactors(mfbi: {
  normalized_stress: number;
  normalized_academic_workload: number;
  normalized_study_time: number;
  normalized_sleep_hours: number;
}): { label: string; score: number; level: BurnoutLevel }[] {
  const factors = [
    { label: FACTOR_LABELS.stress, score: Number(mfbi.normalized_stress) },
    {
      label: FACTOR_LABELS.workload,
      score: Number(mfbi.normalized_academic_workload),
    },
    {
      label: FACTOR_LABELS.studyTime,
      score: Number(mfbi.normalized_study_time),
    },
    { label: FACTOR_LABELS.sleep, score: Number(mfbi.normalized_sleep_hours) },
  ];

  return factors
    .map((factor) => ({
      ...factor,
      level: classifyMfbiScore(factor.score),
    }))
    .filter(
      (factor) => factor.level === "High" || factor.level === "Severe"
    );
}

function instructorStudentLabel(input: {
  studentName: string;
  yearLevel: number | null;
  course: string | null;
  section: string | null;
}) {
  const year =
    input.yearLevel != null
      ? `${formatYearLevel(input.yearLevel).replace("year", "Year")} Student`
      : "Student";
  const details = [
    input.course?.trim() || null,
    input.section?.trim() ? `Section ${input.section.trim()}` : null,
  ].filter(Boolean);

  if (details.length) {
    return `${input.studentName}, a ${year} in ${details.join(" · ")}`;
  }
  return `${input.studentName}, a ${year}`;
}

async function notifyDepartmentInstructors(input: {
  studentName: string;
  yearLevel: number | null;
  course: string | null;
  section: string | null;
  departmentId: number | null;
  weekNumber: number;
  mfbiScore: number;
  burnoutLevel: string;
  alertHigh: boolean;
  earlyWarningMessage: string | null;
  monitoringId: number;
  predictionId: number | null;
}) {
  if (!input.departmentId) return;

  try {
    const admin = createAdminClient();
    const { data: instructors, error } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "Instructor")
      .eq("is_active", true)
      .eq("department_id", input.departmentId);

    if (error || !instructors?.length) return;

    const student = instructorStudentLabel(input);
    const title = input.alertHigh
      ? `High burnout risk · ${input.studentName}`
      : `${input.studentName} submitted Week ${input.weekNumber}`;
    const message = input.alertHigh
      ? `${student} has elevated burnout risk. Week ${input.weekNumber}: MFBI ${input.mfbiScore.toFixed(2)} (${input.burnoutLevel}).${input.earlyWarningMessage ? ` ${input.earlyWarningMessage}` : ""}`
      : `${student} completed Week ${input.weekNumber} monitoring. MFBI ${input.mfbiScore.toFixed(2)} (${input.burnoutLevel}). Current risk: ${input.burnoutLevel}.`;

    await admin.from("notifications").insert(
      instructors.map((instructor) => ({
        user_id: instructor.id,
        title,
        message,
        notification_type: input.alertHigh ? "Burnout Alert" : "Assessment",
        priority: input.alertHigh ? "High" : "Normal",
        monitoring_id: input.monitoringId,
        prediction_id: input.predictionId,
      }))
    );
  } catch (error) {
    console.error("notifyDepartmentInstructors:", error);
  }
}

export type FinalizeMonitoringResult = {
  complete: boolean;
  resumed: boolean;
  weekNumber: number;
  monitoringId: number;
  mfbiScore: number | null;
  burnoutLevel: string | null;
  prediction: string | null;
  message: string;
};

/**
 * Finish MFBI / ML prediction / RAG / alerts for a monitoring row that may have
 * been interrupted mid-submit (reload, network drop, AI timeout).
 * Safe to call repeatedly — skips steps that already succeeded.
 */
export async function finalizeWeeklyMonitoring(
  supabase: SupabaseClient,
  input: {
    studentId: string;
    profile: Pick<
      Profile,
      | "first_name"
      | "middle_name"
      | "last_name"
      | "suffix"
      | "year_level"
      | "course"
      | "section"
      | "department_id"
      | "role"
    >;
    monitoringId: number;
  }
): Promise<FinalizeMonitoringResult> {
  const { data: monitoring, error: monitoringError } = await supabase
    .from("weekly_monitoring")
    .select(
      "monitoring_id, student_id, term_id, week_number, stress_score, academic_workload_score, study_time_score, sleep_hours_score, submitted_at, status, mfbi_results(mfbi_id, mfbi_score, burnout_risk_level, normalized_stress, normalized_academic_workload, normalized_study_time, normalized_sleep_hours)"
    )
    .eq("monitoring_id", input.monitoringId)
    .eq("student_id", input.studentId)
    .maybeSingle();

  if (monitoringError || !monitoring) {
    return {
      complete: false,
      resumed: false,
      weekNumber: 0,
      monitoringId: input.monitoringId,
      mfbiScore: null,
      burnoutLevel: null,
      prediction: null,
      message: "Monitoring submission was not found.",
    };
  }

  const weekNumber = Number(monitoring.week_number);
  const scores = {
    stress_score: Number(monitoring.stress_score),
    stress_level:
      Number(monitoring.stress_score) <= 13
        ? ("Low" as const)
        : Number(monitoring.stress_score) <= 26
          ? ("Moderate" as const)
          : ("High" as const),
    academic_workload_score: Number(monitoring.academic_workload_score),
    study_time_score: Number(monitoring.study_time_score),
    sleep_hours_score: Number(monitoring.sleep_hours_score),
  };

  let resumed = false;
  let mfbiRaw = monitoring.mfbi_results;
  let mfbiRow = (Array.isArray(mfbiRaw) ? mfbiRaw[0] : mfbiRaw) as
    | {
        mfbi_id: number;
        mfbi_score: number;
        burnout_risk_level: string;
        normalized_stress: number;
        normalized_academic_workload: number;
        normalized_study_time: number;
        normalized_sleep_hours: number;
      }
    | null
    | undefined;

  if (!mfbiRow?.mfbi_id) {
    resumed = true;
    const mfbi = computeMfbi({
      stressScore: scores.stress_score,
      academicWorkload: scores.academic_workload_score,
      studyTime: scores.study_time_score,
      sleepRisk: scores.sleep_hours_score,
    });
    const { data: inserted, error: mfbiError } = await supabase
      .from("mfbi_results")
      .insert({
        monitoring_id: monitoring.monitoring_id,
        ...mfbi,
        remarks: `Auto-computed from week ${weekNumber} monitoring`,
      })
      .select(
        "mfbi_id, mfbi_score, burnout_risk_level, normalized_stress, normalized_academic_workload, normalized_study_time, normalized_sleep_hours"
      )
      .single();

    if (mfbiError || !inserted) {
      return {
        complete: false,
        resumed,
        weekNumber,
        monitoringId: monitoring.monitoring_id,
        mfbiScore: null,
        burnoutLevel: null,
        prediction: null,
        message: `Monitoring is saved, but scoring could not finish: ${mfbiError?.message ?? "unknown error"}`,
      };
    }
    mfbiRow = inserted;
  }

  const mfbiForFactors: MfbiResult = {
    mfbi_score: Number(mfbiRow.mfbi_score),
    burnout_risk_level: String(mfbiRow.burnout_risk_level) as BurnoutLevel,
    normalized_stress: Number(mfbiRow.normalized_stress),
    normalized_academic_workload: Number(mfbiRow.normalized_academic_workload),
    normalized_study_time: Number(mfbiRow.normalized_study_time),
    normalized_sleep_hours: Number(mfbiRow.normalized_sleep_hours),
  };

  const { data: existingPrediction } = await supabase
    .from("ml_predictions")
    .select(
      "prediction_id, final_prediction, selected_model, remarks, decision_tree_prediction, random_forest_prediction, decision_tree_confidence, random_forest_confidence, model_version"
    )
    .eq("mfbi_id", mfbiRow.mfbi_id)
    .order("prediction_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let predictionRow = existingPrediction;
  let predictionRemarks = existingPrediction?.remarks ?? null;
  let finalPrediction = existingPrediction?.final_prediction ?? null;
  let selectedModel = existingPrediction?.selected_model ?? null;

  if (!predictionRow) {
    resumed = true;
    const { data: priorRows } = await supabase
      .from("weekly_monitoring")
      .select(
        "week_number, stress_score, academic_workload_score, study_time_score, sleep_hours_score, mfbi_results(mfbi_score, burnout_risk_level)"
      )
      .eq("student_id", input.studentId)
      .eq("term_id", monitoring.term_id)
      .lt("week_number", weekNumber)
      .order("week_number", { ascending: true });

    const historyLevels: string[] = [];
    const historyMfbi: number[] = [];
    let priorWeek: {
      stress_score: number;
      academic_workload_score: number;
      study_time_score: number;
      sleep_hours_score: number;
    } | null = null;

    for (const row of priorRows ?? []) {
      const priorMfbiRaw = row.mfbi_results;
      const mfbiPrior = Array.isArray(priorMfbiRaw)
        ? priorMfbiRaw[0]
        : priorMfbiRaw;
      if (mfbiPrior?.burnout_risk_level) {
        historyLevels.push(String(mfbiPrior.burnout_risk_level));
      }
      if (mfbiPrior?.mfbi_score != null) {
        historyMfbi.push(Number(mfbiPrior.mfbi_score));
      }
    }

    if (priorRows && priorRows.length > 0) {
      const last = priorRows[priorRows.length - 1];
      priorWeek = {
        stress_score: Number(last.stress_score),
        academic_workload_score: Number(last.academic_workload_score),
        study_time_score: Number(last.study_time_score),
        sleep_hours_score: Number(last.sleep_hours_score),
      };
    } else {
      priorWeek = FIRST_WEEK_BASELINE_PRIOR;
      historyLevels.push(FIRST_WEEK_BASELINE_LEVEL);
      historyMfbi.push(FIRST_WEEK_BASELINE_MFBI);
    }

    historyLevels.push(String(mfbiRow.burnout_risk_level));
    historyMfbi.push(Number(mfbiRow.mfbi_score));

    const prediction = await predictBurnoutRiskWithAi(mfbiForFactors, scores, {
      studentId: input.studentId,
      priorWeek,
      historyLevels,
      historyMfbi,
    });

    const submittedAt =
      monitoring.submitted_at ?? new Date().toISOString();
    const { data: insertedPrediction, error: predictionError } = await supabase
      .from("ml_predictions")
      .insert({
        mfbi_id: mfbiRow.mfbi_id,
        ...prediction,
        prediction_date: submittedAt,
      })
      .select(
        "prediction_id, final_prediction, selected_model, remarks, decision_tree_prediction, random_forest_prediction, decision_tree_confidence, random_forest_confidence, model_version"
      )
      .single();

    if (predictionError || !insertedPrediction) {
      return {
        complete: false,
        resumed,
        weekNumber,
        monitoringId: monitoring.monitoring_id,
        mfbiScore: Number(mfbiRow.mfbi_score),
        burnoutLevel: String(mfbiRow.burnout_risk_level),
        prediction: null,
        message: `Scores are saved, but AI prediction could not finish: ${predictionError?.message ?? "unknown error"}`,
      };
    }

    predictionRow = insertedPrediction;
    predictionRemarks = insertedPrediction.remarks;
    finalPrediction = insertedPrediction.final_prediction;
    selectedModel = insertedPrediction.selected_model;
  }

  // RAG advice — best effort; already idempotent via ensureRagRecommendation.
  try {
    await ensureRagRecommendation(supabase, input.studentId, {
      monitoring_id: monitoring.monitoring_id,
      week_number: weekNumber,
      stress_score: scores.stress_score,
      academic_workload: scores.academic_workload_score,
      study_time: scores.study_time_score,
      sleep_hours: scores.sleep_hours_score,
      monitoring_date: monitoring.submitted_at ?? new Date().toISOString(),
      remarks: null,
      created_at: monitoring.submitted_at ?? new Date().toISOString(),
      status: monitoring.status,
      mfbi_results: {
        mfbi_id: mfbiRow.mfbi_id,
        mfbi_score: Number(mfbiRow.mfbi_score),
        burnout_level: String(mfbiRow.burnout_risk_level),
        normalized_stress: Number(mfbiRow.normalized_stress),
        normalized_workload: Number(mfbiRow.normalized_academic_workload),
        normalized_study_time: Number(mfbiRow.normalized_study_time),
        normalized_sleep: Number(mfbiRow.normalized_sleep_hours),
      },
      prediction: predictionRow
        ? {
            final_prediction: String(predictionRow.final_prediction),
            selected_model: String(
              predictionRow.selected_model ?? selectedModel ?? "Random Forest"
            ),
            decision_tree_prediction: String(
              predictionRow.decision_tree_prediction ??
                predictionRow.final_prediction
            ),
            random_forest_prediction: String(
              predictionRow.random_forest_prediction ??
                predictionRow.final_prediction
            ),
            decision_tree_confidence:
              predictionRow.decision_tree_confidence != null
                ? Number(predictionRow.decision_tree_confidence)
                : null,
            random_forest_confidence:
              predictionRow.random_forest_confidence != null
                ? Number(predictionRow.random_forest_confidence)
                : null,
            model_version: predictionRow.model_version ?? null,
            prediction_date: null,
            remarks: predictionRemarks,
          }
        : null,
    });
  } catch (error) {
    console.error("finalizeWeeklyMonitoring RAG:", error);
  }

  const { data: priorForTrend } = await supabase
    .from("weekly_monitoring")
    .select("mfbi_results(mfbi_score)")
    .eq("student_id", input.studentId)
    .eq("term_id", monitoring.term_id)
    .lt("week_number", weekNumber)
    .order("week_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const priorMfbiRaw = priorForTrend?.mfbi_results;
  const priorMfbi = Array.isArray(priorMfbiRaw)
    ? priorMfbiRaw[0]
    : priorMfbiRaw;
  const previousMfbiScore =
    priorMfbi?.mfbi_score != null ? Number(priorMfbi.mfbi_score) : null;

  await saveBurnoutTrend(supabase, {
    studentId: input.studentId,
    termId: monitoring.term_id,
    weekNumber,
    monitoringId: monitoring.monitoring_id,
    mfbiScore: Number(mfbiRow.mfbi_score),
    riskLevel: mfbiRow.burnout_risk_level,
    previousMfbiScore,
  });

  const { parseEarlyWarningRemarks } = await import("@/lib/student/ai-client");
  const earlyWarning = parseEarlyWarningRemarks(predictionRemarks);
  const mfbiScore = Number(mfbiRow.mfbi_score);
  const mfbiRisk =
    resolveMfbiBurnoutLevel(mfbiScore, mfbiRow.burnout_risk_level) ??
    String(mfbiRow.burnout_risk_level);
  const alertHigh = mfbiRisk === "High" || mfbiRisk === "Severe";
  const elevatedFactors = highMfbiFactors(mfbiForFactors);
  const factorAlert = elevatedFactors.length > 0;

  const { data: existingNotif } = await supabase
    .from("notifications")
    .select("notification_id")
    .eq("user_id", input.studentId)
    .eq("monitoring_id", monitoring.monitoring_id)
    .eq("notification_type", "Assessment")
    .limit(1)
    .maybeSingle();

  if (!existingNotif) {
    resumed = true;
    await supabase.from("notifications").insert([
      {
        user_id: input.studentId,
        title: "Weekly monitoring submitted",
        message: `Week ${weekNumber} monitoring was saved successfully. MFBI ${mfbiScore.toFixed(2)} (${mfbiRisk}).`,
        notification_type: "Assessment",
        priority: "Normal",
        monitoring_id: monitoring.monitoring_id,
        prediction_id: predictionRow?.prediction_id ?? null,
      },
      ...(alertHigh
        ? [
            {
              user_id: input.studentId,
              title: "Counseling recommendation",
              message:
                earlyWarning?.warning_message ??
                `Your MFBI burnout risk is ${mfbiRisk} (${mfbiScore.toFixed(2)}). Consider reviewing guidance recommendations and contacting the Guidance Office if needed.`,
              notification_type: "Counseling" as const,
              priority: "High" as const,
              monitoring_id: monitoring.monitoring_id,
              prediction_id: predictionRow?.prediction_id ?? null,
            },
          ]
        : []),
      ...(factorAlert
        ? [
            {
              user_id: input.studentId,
              title:
                elevatedFactors.length === 1
                  ? `High ${elevatedFactors[0].label}`
                  : "High burnout factors detected",
              message: `Week ${weekNumber}: ${elevatedFactors
                .map(
                  (factor) =>
                    `${factor.label} is ${factor.level} (${factor.score.toFixed(2)})`
                )
                .join("; ")}. Review your recommendations and consider adjusting these areas this week.`,
              notification_type: "Assessment" as const,
              priority: "High" as const,
              monitoring_id: monitoring.monitoring_id,
              prediction_id: predictionRow?.prediction_id ?? null,
            },
          ]
        : []),
    ]);

    await notifyDepartmentInstructors({
      studentName: buildFullName(input.profile),
      yearLevel: input.profile.year_level,
      course: input.profile.course,
      section: input.profile.section,
      departmentId: input.profile.department_id,
      weekNumber,
      mfbiScore,
      burnoutLevel: mfbiRisk,
      alertHigh,
      earlyWarningMessage: earlyWarning?.warning_message ?? null,
      monitoringId: monitoring.monitoring_id,
      predictionId: predictionRow?.prediction_id ?? null,
    });
  }

  if (monitoring.status !== "Submitted") {
    await supabase
      .from("weekly_monitoring")
      .update({ status: "Submitted" })
      .eq("monitoring_id", monitoring.monitoring_id);
  }

  return {
    complete: true,
    resumed,
    weekNumber,
    monitoringId: monitoring.monitoring_id,
    mfbiScore,
    burnoutLevel: mfbiRisk,
    prediction: finalPrediction,
    message: resumed
      ? `Week ${weekNumber} processing finished. MFBI ${mfbiScore.toFixed(2)} (${mfbiRisk}). Prediction: ${finalPrediction}.`
      : `Week ${weekNumber} already complete. MFBI ${mfbiScore.toFixed(2)} (${mfbiRisk}). Prediction: ${finalPrediction}.`,
  };
}

/** Find this week's monitoring row for a student (if any). */
export async function getCurrentWeekMonitoringId(
  supabase: SupabaseClient,
  studentId: string
): Promise<number | null> {
  const term = await getActiveTerm(supabase);
  if (!term?.term_id) return null;
  const week = getCurrentWeekNumber(term);

  const { data } = await supabase
    .from("weekly_monitoring")
    .select("monitoring_id")
    .eq("student_id", studentId)
    .eq("term_id", term.term_id)
    .eq("week_number", week)
    .maybeSingle();

  return data?.monitoring_id ?? null;
}

/**
 * If this week's submission exists but ML/RAG/alerts are incomplete, finish them.
 * Used after reload / interrupted submit.
 */
export async function ensureCurrentWeekMonitoringFinalized(
  supabase: SupabaseClient,
  studentId: string,
  profile: FinalizeWeeklyMonitoringProfile
): Promise<FinalizeMonitoringResult | null> {
  const monitoringId = await getCurrentWeekMonitoringId(supabase, studentId);
  if (!monitoringId) return null;

  const { data: mfbi } = await supabase
    .from("mfbi_results")
    .select("mfbi_id")
    .eq("monitoring_id", monitoringId)
    .maybeSingle();

  if (mfbi?.mfbi_id) {
    const { data: prediction } = await supabase
      .from("ml_predictions")
      .select("prediction_id")
      .eq("mfbi_id", mfbi.mfbi_id)
      .limit(1)
      .maybeSingle();

    // Core pipeline already finished — skip heavy finalize on every page load.
    if (prediction?.prediction_id) return null;
  }

  return finalizeWeeklyMonitoring(supabase, {
    studentId,
    profile,
    monitoringId,
  });
}

export type FinalizeWeeklyMonitoringProfile = Pick<
  Profile,
  | "first_name"
  | "middle_name"
  | "last_name"
  | "suffix"
  | "year_level"
  | "course"
  | "section"
  | "department_id"
  | "role"
>;
