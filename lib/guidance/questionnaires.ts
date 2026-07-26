import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type QuestionnaireRow = {
  questionnaire_id: number;
  questionnaire_name: string;
  description: string | null;
  total_questions: number;
  is_active: boolean;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  updated_at: string;
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
};

export async function getQuestionnaires(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("questionnaires")
    .select(
      "questionnaire_id, questionnaire_name, description, total_questions, is_active, available_from, available_until, created_at, updated_at"
    )
    .order("questionnaire_name", { ascending: true });

  return (data ?? []) as QuestionnaireRow[];
}

export async function getQuestionnaireById(
  supabase: SupabaseClient,
  questionnaireId: number
) {
  const { data, error } = await supabase
    .from("questionnaires")
    .select(
      "questionnaire_id, questionnaire_name, description, total_questions, is_active, available_from, available_until, created_at, updated_at"
    )
    .eq("questionnaire_id", questionnaireId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load questionnaire: ${error.message}`);
  }

  return (data as QuestionnaireRow | null) ?? null;
}

export async function getQuestionsForQuestionnaire(
  supabase: SupabaseClient,
  questionnaireId: number
) {
  const { data } = await supabase
    .from("questions")
    .select(
      "question_id, questionnaire_id, question_text, question_order, response_type, reverse_scored, is_required, is_active"
    )
    .eq("questionnaire_id", questionnaireId)
    .order("question_order", { ascending: true });

  return (data ?? []) as QuestionRow[];
}

export async function syncQuestionnaireQuestionCount(
  supabase: SupabaseClient,
  questionnaireId: number
) {
  const { count } = await supabase
    .from("questions")
    .select("*", { count: "exact", head: true })
    .eq("questionnaire_id", questionnaireId)
    .eq("is_active", true);

  await supabase
    .from("questionnaires")
    .update({ total_questions: count ?? 0 })
    .eq("questionnaire_id", questionnaireId);
}
