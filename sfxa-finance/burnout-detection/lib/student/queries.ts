import type { createClient } from "@/lib/supabase/server";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type MonitoringRow = {
  monitoring_id: number;
  week_number: number;
  stress_score: number;
  academic_workload: number;
  study_time: number;
  sleep_hours: number;
  monitoring_date: string;
  remarks: string | null;
  created_at: string;
  status: string | null;
  mfbi_results:
    | {
        mfbi_score: number;
        burnout_level: string;
        normalized_stress: number;
        normalized_workload: number;
        normalized_study_time: number;
        normalized_sleep: number;
      }
    | {
        mfbi_score: number;
        burnout_level: string;
        normalized_stress: number;
        normalized_workload: number;
        normalized_study_time: number;
        normalized_sleep: number;
      }[]
    | null;
  prediction?: {
    final_prediction: string;
    selected_model: string;
    decision_tree_prediction: string;
    random_forest_prediction: string;
  } | null;
};

function unwrapMfbi(row: MonitoringRow) {
  const mfbi = row.mfbi_results;
  if (!mfbi) return null;
  return Array.isArray(mfbi) ? mfbi[0] ?? null : mfbi;
}

export async function getWeeklyMonitoringHistory(
  supabase: SupabaseClient,
  studentId: string
) {
  const { data } = await supabase
    .from("weekly_monitoring")
    .select(
      "monitoring_id, week_number, stress_score, academic_workload_score, study_time_score, sleep_hours_score, submitted_at, remarks, created_at, status, mfbi_results(mfbi_id, mfbi_score, burnout_risk_level, normalized_stress, normalized_academic_workload, normalized_study_time, normalized_sleep_hours, ml_predictions(final_prediction, selected_model, decision_tree_prediction, random_forest_prediction))"
    )
    .eq("student_id", studentId)
    .order("week_number", { ascending: false });

  const rows = data ?? [];

  return rows.map((row) => {
    const mfbiRaw = row.mfbi_results;
    const mfbi = Array.isArray(mfbiRaw) ? mfbiRaw[0] : mfbiRaw;
    const predictionRaw = mfbi?.ml_predictions;
    const prediction = Array.isArray(predictionRaw)
      ? predictionRaw[0]
      : predictionRaw;

    return {
      monitoring_id: row.monitoring_id,
      week_number: row.week_number,
      stress_score: Number(row.stress_score),
      academic_workload: Number(row.academic_workload_score),
      study_time: Number(row.study_time_score),
      sleep_hours: Number(row.sleep_hours_score),
      monitoring_date: row.submitted_at,
      remarks: row.remarks,
      created_at: row.created_at,
      status: row.status,
      mfbi_results: mfbi
        ? {
            mfbi_score: Number(mfbi.mfbi_score),
            burnout_level: mfbi.burnout_risk_level,
            normalized_stress: Number(mfbi.normalized_stress),
            normalized_workload: Number(mfbi.normalized_academic_workload),
            normalized_study_time: Number(mfbi.normalized_study_time),
            normalized_sleep: Number(mfbi.normalized_sleep_hours),
          }
        : null,
      prediction: prediction
        ? {
            final_prediction: prediction.final_prediction,
            selected_model: prediction.selected_model,
            decision_tree_prediction: prediction.decision_tree_prediction,
            random_forest_prediction: prediction.random_forest_prediction,
          }
        : null,
    } satisfies MonitoringRow;
  });
}

export async function getLatestBurnoutSnapshot(
  supabase: SupabaseClient,
  studentId: string
) {
  const [history, term] = await Promise.all([
    getWeeklyMonitoringHistory(supabase, studentId),
    getActiveTerm(supabase),
  ]);

  const latest = history[0] ?? null;
  const mfbi = latest ? unwrapMfbi(latest) : null;
  const currentWeek = term ? getCurrentWeekNumber(term) : null;
  const monitoringEnabled = Boolean(term?.monitoring_enabled);
  const submittedThisWeek = Boolean(
    currentWeek && history.some((row) => row.week_number === currentWeek)
  );

  return {
    stress: latest
      ? {
          stress_score: latest.stress_score,
          stress_level:
            latest.stress_score <= 13
              ? "Low"
              : latest.stress_score <= 26
                ? "Moderate"
                : "High",
          assessment_date: latest.monitoring_date,
        }
      : null,
    latest,
    mfbi,
    term,
    currentWeek,
    monitoringEnabled,
    submittedThisWeek,
    history,
  };
}

export async function getStudentNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 12
) {
  const { data } = await supabase
    .from("notifications")
    .select(
      "notification_id, title, message, notification_type, priority, is_read, created_at, monitoring_id"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function ensureWeeklyMonitoringReminder(
  supabase: SupabaseClient,
  studentId: string,
  currentWeek: number | null,
  submittedThisWeek: boolean
) {
  if (!currentWeek || submittedThisWeek) return;

  const title = `Weekly monitoring reminder · Week ${currentWeek}`;
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { data: existing } = await supabase
    .from("notifications")
    .select("notification_id")
    .eq("user_id", studentId)
    .eq("notification_type", "Reminder")
    .eq("title", title)
    .gte("created_at", since.toISOString())
    .maybeSingle();

  if (existing) return;

  await supabase.from("notifications").insert({
    user_id: studentId,
    title,
    message:
      "Please complete this week's consolidated monitoring form (PSS, workload, study time, and sleep).",
    notification_type: "Reminder",
    priority: "Normal",
  });
}

export { unwrapMfbi };
