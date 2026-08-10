"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { toAuditLogRow } from "@/lib/audit";
import { requireRole, requireUser } from "@/lib/auth/session";
import { computeMfbi } from "@/lib/student/mfbi";
import { saveBurnoutTrend } from "@/lib/student/burnout-trends";
import { predictBurnoutRiskWithAi } from "@/lib/student/predict";
import { getWeeklyMonitoringSections } from "@/lib/student/questionnaires";
import {
  computeSectionScores,
  validateAllAnswers,
  type AnswerMap,
} from "@/lib/student/scoring";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";

export type StudentActionState = {
  error?: string;
  success?: string;
};

async function getRequestIp() {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null
  );
}

export async function submitWeeklyMonitoring(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  try {
    return await submitWeeklyMonitoringInner(_prev, formData);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error("submitWeeklyMonitoring:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to submit weekly monitoring. Please try again.",
    };
  }
}

async function submitWeeklyMonitoringInner(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const { supabase, user, profile } = await requireRole(["Student"]);

  const remarks = String(formData.get("remarks") || "").trim() || null;
  const weekRaw = String(formData.get("week_number") || "").trim();

  const [sections, term] = await Promise.all([
    getWeeklyMonitoringSections(supabase),
    getActiveTerm(supabase),
  ]);

  if (sections.some((section) => section.questions.length === 0)) {
    return {
      error:
        "Questionnaires are not configured yet. Ask the Guidance Office to activate Phase 2 questions.",
    };
  }

  const answers: AnswerMap = {};
  for (const section of sections) {
    for (const question of section.questions) {
      const raw = String(formData.get(`q_${question.question_id}`) || "").trim();
      if (!raw) continue;
      answers[question.question_id] = Number(raw);
    }
  }

  const validationError = validateAllAnswers(sections, answers);
  if (validationError) {
    return { error: validationError };
  }

  let scores;
  try {
    scores = computeSectionScores(sections, answers);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to score responses.",
    };
  }

  if (!term) {
    return { error: "No active academic term is configured." };
  }

  if (!term.monitoring_enabled) {
    return {
      error:
        "Weekly monitoring is not open yet. Wait for the Guidance Office to open this week's form.",
    };
  }

  const week_number = weekRaw ? Number(weekRaw) : getCurrentWeekNumber(term);
  if (
    Number.isNaN(week_number) ||
    week_number < 1 ||
    week_number !== getCurrentWeekNumber(term)
  ) {
    return { error: "Invalid week number for the open monitoring window." };
  }

  const { data: existing } = await supabase
    .from("weekly_monitoring")
    .select("monitoring_id")
    .eq("student_id", user.id)
    .eq("term_id", term.term_id)
    .eq("week_number", week_number)
    .maybeSingle();

  if (existing) {
    return {
      error: `You already submitted monitoring for week ${week_number}.`,
    };
  }

  const { data: monitoring, error: monitoringError } = await supabase
    .from("weekly_monitoring")
    .insert({
      student_id: user.id,
      term_id: term.term_id,
      week_number,
      stress_score: scores.stress_score,
      academic_workload_score: scores.academic_workload_score,
      study_time_score: scores.study_time_score,
      sleep_hours_score: scores.sleep_hours_score,
      status: "Submitted",
      submitted_at: new Date().toISOString(),
      remarks,
    })
    .select("monitoring_id")
    .single();

  if (monitoringError || !monitoring) {
    return {
      error: monitoringError?.message || "Failed to save weekly monitoring.",
    };
  }

  const answerRows = Object.entries(answers).map(([questionId, answer_value]) => ({
    monitoring_id: monitoring.monitoring_id,
    question_id: Number(questionId),
    answer_value,
  }));

  const { error: answersError } = await supabase
    .from("weekly_monitoring_answers")
    .insert(answerRows);

  if (answersError) {
    await supabase
      .from("weekly_monitoring")
      .delete()
      .eq("monitoring_id", monitoring.monitoring_id);
    return { error: `Failed to save answers: ${answersError.message}` };
  }

  const mfbi = computeMfbi({
    stressScore: scores.stress_score,
    academicWorkload: scores.academic_workload_score,
    studyTime: scores.study_time_score,
    sleepRisk: scores.sleep_hours_score,
  });

  const { data: mfbiRow, error: mfbiError } = await supabase
    .from("mfbi_results")
    .insert({
      monitoring_id: monitoring.monitoring_id,
      ...mfbi,
      remarks: `Auto-computed from week ${week_number} monitoring`,
    })
    .select("mfbi_id, mfbi_score, burnout_risk_level")
    .single();

  if (mfbiError || !mfbiRow) {
    return {
      error: `Monitoring saved but MFBI failed: ${mfbiError?.message ?? "unknown error"}`,
    };
  }

  const { data: priorRows } = await supabase
    .from("weekly_monitoring")
    .select(
      "week_number, stress_score, academic_workload_score, study_time_score, sleep_hours_score, mfbi_results(mfbi_score, burnout_risk_level)"
    )
    .eq("student_id", user.id)
    .eq("term_id", term.term_id)
    .lt("week_number", week_number)
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
    const mfbiRaw = row.mfbi_results;
    const mfbiPrior = Array.isArray(mfbiRaw) ? mfbiRaw[0] : mfbiRaw;
    if (mfbiPrior?.burnout_risk_level) {
      historyLevels.push(String(mfbiPrior.burnout_risk_level));
    }
    if (mfbiPrior?.mfbi_score != null) {
      historyMfbi.push(Number(mfbiPrior.mfbi_score));
    }
  }

  // Include the week being submitted in trend history.
  historyLevels.push(mfbi.burnout_risk_level);
  historyMfbi.push(mfbi.mfbi_score);

  if (priorRows && priorRows.length > 0) {
    const last = priorRows[priorRows.length - 1];
    priorWeek = {
      stress_score: Number(last.stress_score),
      academic_workload_score: Number(last.academic_workload_score),
      study_time_score: Number(last.study_time_score),
      sleep_hours_score: Number(last.sleep_hours_score),
    };
  }

  const prediction = await predictBurnoutRiskWithAi(mfbi, scores, {
    studentId: user.id,
    priorWeek,
    historyLevels,
    historyMfbi,
  });
  const { data: predictionRow, error: predictionError } = await supabase
    .from("ml_predictions")
    .insert({
      mfbi_id: mfbiRow.mfbi_id,
      ...prediction,
    })
    .select("prediction_id, final_prediction")
    .single();

  if (predictionError) {
    return {
      error: `MFBI saved but prediction failed: ${predictionError.message}`,
    };
  }

  await saveBurnoutTrend(supabase, {
    studentId: user.id,
    termId: term.term_id,
    weekNumber: week_number,
    monitoringId: monitoring.monitoring_id,
    mfbiScore: Number(mfbiRow.mfbi_score),
    riskLevel: prediction.final_prediction,
    previousMfbiScore:
      historyMfbi.length >= 2 ? historyMfbi[historyMfbi.length - 2] : null,
  });

  const ip = await getRequestIp();
  const { parseEarlyWarningRemarks } = await import("@/lib/student/ai-client");
  const earlyWarning = parseEarlyWarningRemarks(prediction.remarks);
  const alertHigh =
    prediction.final_prediction === "High" ||
    prediction.final_prediction === "Severe" ||
    earlyWarning?.next_week_risk === "High" ||
    earlyWarning?.week2_risk === "High";

  await supabase.from("notifications").insert([
    {
      user_id: user.id,
      title: "Weekly monitoring submitted",
      message: `Week ${week_number} monitoring was saved successfully. MFBI ${Number(mfbiRow.mfbi_score).toFixed(2)} (${mfbiRow.burnout_risk_level}). Current risk: ${prediction.final_prediction}.`,
      notification_type: "Assessment",
      priority: "Normal",
      monitoring_id: monitoring.monitoring_id,
      prediction_id: predictionRow?.prediction_id ?? null,
    },
    ...(alertHigh
      ? [
          {
            user_id: user.id,
            title: "Counseling recommendation",
            message:
              earlyWarning?.warning_message ??
              `Your predicted burnout risk is ${prediction.final_prediction}. Consider reviewing guidance recommendations and contacting the Guidance Office if needed.`,
            notification_type: "Counseling" as const,
            priority: "High" as const,
            monitoring_id: monitoring.monitoring_id,
            prediction_id: predictionRow?.prediction_id ?? null,
          },
        ]
      : []),
  ]);

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "SUBMIT_WEEKLY_MONITORING",
      action_type: "CREATE",
      table_name: "weekly_monitoring",
      record_id: monitoring.monitoring_id,
      description: `Week ${week_number} MFBI ${mfbiRow.mfbi_score} (${mfbiRow.burnout_risk_level}); prediction ${prediction.final_prediction}`,
      ip_address: ip,
    })
  );

  revalidatePath("/student");
  revalidatePath("/student/monitoring");
  revalidatePath("/student/burnout");
  revalidatePath("/student/recommendations");
  revalidatePath("/student/notifications");

  return {
    success: `Week ${week_number} submitted. MFBI ${Number(mfbiRow.mfbi_score).toFixed(2)} (${mfbiRow.burnout_risk_level}). Prediction: ${prediction.final_prediction}.`,
  };
}

export async function markNotificationRead(
  _prev: StudentActionState,
  formData: FormData
): Promise<StudentActionState> {
  const { supabase, user } = await requireUser();
  const notificationId = Number(formData.get("notification_id"));

  if (!notificationId) {
    return { error: "Invalid notification." };
  }

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("notification_id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/student");
  revalidatePath("/student/notifications");
  return { success: "Notification marked as read." };
}
