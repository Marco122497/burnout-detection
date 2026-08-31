import { cache } from "react";

import type { createClient } from "@/lib/supabase/server";
import type { ScaleOption } from "@/lib/student/scale-options";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export const QUESTIONNAIRE_KEYS = [
  "pss",
  "workload",
  "study",
  "sleep",
] as const;

export type QuestionnaireKey = (typeof QUESTIONNAIRE_KEYS)[number];

export const QUESTIONNAIRE_NAMES: Record<QuestionnaireKey, string> = {
  pss: "Perceived Stress Scale (PSS-10)",
  workload: "Academic Workload",
  study: "Study Time",
  sleep: "Sleep Hours",
};

export type QuestionRow = {
  question_id: number;
  questionnaire_id: number;
  question_text: string;
  question_order: number;
  response_type: "Likert Scale" | "Number" | "Hours" | "Yes/No";
  reverse_scored: boolean;
  is_required: boolean;
  is_active: boolean;
  scale_options?: ScaleOption[] | null;
};

export type QuestionnaireSection = {
  key: QuestionnaireKey;
  questionnaire_id: number;
  questionnaire_name: string;
  description: string | null;
  questions: QuestionRow[];
};

const LIKERT_LABELS = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
] as const;

const PSS_LABELS = [
  { value: 1, label: "Never" },
  { value: 2, label: "Almost Never" },
  { value: 3, label: "Sometimes" },
  { value: 4, label: "Fairly Often" },
  { value: 5, label: "Very Often" },
] as const;

const SLEEP_LABELS = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
] as const;

/** Academic Workload: 1 = Definitely Disagree … 5 = Definitely Agree */
const WORKLOAD_LABELS = [
  { value: 1, label: "Definitely Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Definitely Agree" },
] as const;

export const WORKLOAD_SCALE_DESCRIPTION =
  "5-point Likert scale (1 means Definitely Disagree and 5 means Definitely Agree).";

/** ST1 fallback labels (weekly hours). Per-question scale_options override in the student form. */
const STUDY_TIME_LABELS = [
  { value: 1, label: "Less than 5 hours" },
  { value: 2, label: "5–10 hours" },
  { value: 3, label: "11–15 hours" },
  { value: 4, label: "16–20 hours" },
  { value: 5, label: "More than 20 hours" },
] as const;

export const STUDY_TIME_SCALE_DESCRIPTION =
  "Question 1: weekly study hours. Question 2: how often you review (Never to Very Often). Both are averaged for your Study Time score.";

export function getScaleOptions(sectionKey: QuestionnaireKey) {
  if (sectionKey === "pss") return PSS_LABELS;
  if (sectionKey === "sleep") return SLEEP_LABELS;
  if (sectionKey === "study") return STUDY_TIME_LABELS;
  if (sectionKey === "workload") return WORKLOAD_LABELS;
  return LIKERT_LABELS;
}

export const getWeeklyMonitoringSections = cache(
  async (supabase: SupabaseClient): Promise<QuestionnaireSection[]> => {
  const now = new Date().toISOString();
  const { data: questionnaires } = await supabase
    .from("questionnaires")
    .select(
      "questionnaire_id, questionnaire_name, description, is_active, available_from, available_until"
    )
    .eq("is_active", true)
    .in("questionnaire_name", Object.values(QUESTIONNAIRE_NAMES));

  const available = (questionnaires ?? []).filter((q) => {
    const from = q.available_from as string | null;
    const until = q.available_until as string | null;
    if (from && from > now) return false;
    if (until && until < now) return false;
    return true;
  });

  if (!available.length) return [];

  const ids = available.map((q) => q.questionnaire_id);
  const { data: questions } = await supabase
    .from("questions")
    .select(
      "question_id, questionnaire_id, question_text, question_order, response_type, reverse_scored, is_required, is_active, scale_options"
    )
    .in("questionnaire_id", ids)
    .eq("is_active", true)
    .order("question_order", { ascending: true });

  const byName = new Map(
    available.map((q) => [q.questionnaire_name, q] as const)
  );

  return QUESTIONNAIRE_KEYS.map((key) => {
    const name = QUESTIONNAIRE_NAMES[key];
    const questionnaire = byName.get(name);
    if (!questionnaire) {
      return {
        key,
        questionnaire_id: 0,
        questionnaire_name: name,
        description: null,
        questions: [],
      };
    }

    return {
      key,
      questionnaire_id: questionnaire.questionnaire_id,
      questionnaire_name: questionnaire.questionnaire_name,
      description: questionnaire.description,
      questions: (questions ?? []).filter(
        (item) => item.questionnaire_id === questionnaire.questionnaire_id
      ) as QuestionRow[],
    };
  }).filter((section) => section.questionnaire_id > 0);
  }
);
