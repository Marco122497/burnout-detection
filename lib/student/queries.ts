import type { createClient } from "@/lib/supabase/server";
import {
  QUESTIONNAIRE_KEYS,
  QUESTIONNAIRE_NAMES,
  type QuestionRow,
} from "@/lib/student/questionnaires";
import { getAnswerLabelForQuestion } from "@/lib/student/scale-options";
import { reconcileMonitoringStudyDisplay } from "@/lib/student/monitoring-display";
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
    decision_tree_confidence?: number | null;
    random_forest_confidence?: number | null;
    model_version?: string | null;
    prediction_date?: string | null;
    remarks?: string | null;
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
  // Shallow nested select first — a deep ml_predictions embed can fail the
  // whole query under RLS and empty the dashboard trend chart.
  const { data, error } = await supabase
    .from("weekly_monitoring")
    .select(
      "monitoring_id, week_number, stress_score, academic_workload_score, study_time_score, sleep_hours_score, submitted_at, remarks, created_at, status, mfbi_results(mfbi_id, mfbi_score, burnout_risk_level, normalized_stress, normalized_academic_workload, normalized_study_time, normalized_sleep_hours)"
    )
    .eq("student_id", studentId)
    .order("week_number", { ascending: false });

  if (error) {
    console.error("getWeeklyMonitoringHistory:", error.message);
  }

  const rows = data ?? [];
  const mfbiIds = rows
    .map((row) => {
      const mfbiRaw = row.mfbi_results;
      const mfbi = Array.isArray(mfbiRaw) ? mfbiRaw[0] : mfbiRaw;
      return mfbi?.mfbi_id as number | undefined;
    })
    .filter((id): id is number => Boolean(id));

  const predictionByMfbi = new Map<
    number,
    {
      final_prediction: string;
      selected_model: string;
      decision_tree_prediction: string;
      random_forest_prediction: string;
      decision_tree_confidence: number | null;
      random_forest_confidence: number | null;
      model_version: string | null;
      prediction_date: string | null;
      remarks: string | null;
    }
  >();

  if (mfbiIds.length) {
    const { data: predictions } = await supabase
      .from("ml_predictions")
      .select(
        "mfbi_id, final_prediction, selected_model, decision_tree_prediction, random_forest_prediction, decision_tree_confidence, random_forest_confidence, model_version, prediction_date, remarks"
      )
      .in("mfbi_id", mfbiIds);

    for (const prediction of predictions ?? []) {
      predictionByMfbi.set(prediction.mfbi_id, {
        final_prediction: prediction.final_prediction,
        selected_model: prediction.selected_model,
        decision_tree_prediction: prediction.decision_tree_prediction,
        random_forest_prediction: prediction.random_forest_prediction,
        decision_tree_confidence:
          prediction.decision_tree_confidence != null
            ? Number(prediction.decision_tree_confidence)
            : null,
        random_forest_confidence:
          prediction.random_forest_confidence != null
            ? Number(prediction.random_forest_confidence)
            : null,
        model_version: prediction.model_version ?? null,
        prediction_date: prediction.prediction_date ?? null,
        remarks: prediction.remarks ?? null,
      });
    }
  }

  return rows.map((row) => {
    const mfbiRaw = row.mfbi_results;
    const mfbi = Array.isArray(mfbiRaw) ? mfbiRaw[0] : mfbiRaw;
    const prediction = mfbi?.mfbi_id
      ? predictionByMfbi.get(mfbi.mfbi_id) ?? null
      : null;

    return reconcileMonitoringStudyDisplay({
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
            decision_tree_confidence: prediction.decision_tree_confidence,
            random_forest_confidence: prediction.random_forest_confidence,
            model_version: prediction.model_version,
            prediction_date: prediction.prediction_date,
            remarks: prediction.remarks,
          }
        : null,
    });
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

export type MonitoringAnswer = {
  question_id: number;
  question_text: string;
  question_order: number;
  questionnaire_name: string;
  answer_value: number;
  answer_label: string | null;
};

export type MonitoringAnswersMap = Record<number, MonitoringAnswer[]>;

const NAME_TO_KEY = new Map(
  QUESTIONNAIRE_KEYS.map((key) => [QUESTIONNAIRE_NAMES[key], key] as const)
);

export async function getMonitoringAnswers(
  supabase: SupabaseClient,
  monitoringIds: number[]
): Promise<MonitoringAnswersMap> {
  if (!monitoringIds.length) return {};

  const { data } = await supabase
    .from("weekly_monitoring_answers")
    .select(
      "monitoring_id, answer_value, questions(question_id, question_text, question_order, questionnaire_id, response_type, scale_options, questionnaires(questionnaire_name))"
    )
    .in("monitoring_id", monitoringIds);

  const sectionOrder = new Map(
    QUESTIONNAIRE_KEYS.map((key, index) => [QUESTIONNAIRE_NAMES[key], index])
  );

  const map: MonitoringAnswersMap = {};

  for (const row of data ?? []) {
    const questionRaw = row.questions;
    const question = Array.isArray(questionRaw) ? questionRaw[0] : questionRaw;
    if (!question) continue;

    const questionnaireRaw = question.questionnaires;
    const questionnaire = Array.isArray(questionnaireRaw)
      ? questionnaireRaw[0]
      : questionnaireRaw;
    const questionnaireName = questionnaire?.questionnaire_name ?? "Other";

    const key = NAME_TO_KEY.get(questionnaireName);
    const questionRow = {
      question_id: question.question_id,
      questionnaire_id: question.questionnaire_id,
      question_text: question.question_text,
      question_order: question.question_order,
      response_type: (question.response_type ?? "Likert Scale") as QuestionRow["response_type"],
      reverse_scored: false,
      is_required: true,
      is_active: true,
      scale_options: question.scale_options,
    } satisfies QuestionRow;

    const label = key
      ? getAnswerLabelForQuestion(
          key,
          questionRow,
          Number(row.answer_value),
          questionnaireName
        )
      : null;

    const list = map[row.monitoring_id] ?? [];
    list.push({
      question_id: question.question_id,
      question_text: question.question_text,
      question_order: question.question_order,
      questionnaire_name: questionnaireName,
      answer_value: Number(row.answer_value),
      answer_label: label,
    });
    map[row.monitoring_id] = list;
  }

  for (const list of Object.values(map)) {
    list.sort((a, b) => {
      const sectionA = sectionOrder.get(a.questionnaire_name) ?? 99;
      const sectionB = sectionOrder.get(b.questionnaire_name) ?? 99;
      if (sectionA !== sectionB) return sectionA - sectionB;
      return a.question_order - b.question_order;
    });
  }

  return map;
}

export async function getStudentNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 12
) {
  const { data } = await supabase
    .from("notifications")
    .select(
      "notification_id, title, message, notification_type, priority, is_read, created_at, monitoring_id, announcement_id"
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
