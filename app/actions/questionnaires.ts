"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { toAuditLogRow } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { syncQuestionnaireQuestionCount } from "@/lib/guidance/questionnaires";
import {
  parseScaleOptionsField,
  supportsCustomScaleOptions,
  validateScaleOptions,
} from "@/lib/student/scale-options";

export type QuestionnaireActionState = {
  error?: string;
  success?: string;
};

async function getIp() {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null
  );
}

function revalidateQuestionnairePaths(questionnaireId?: number) {
  revalidatePath("/guidance/questionnaires");
  if (questionnaireId) {
    revalidatePath(`/guidance/questionnaires/${questionnaireId}`);
  }
  revalidatePath("/student/monitoring");
}

export async function updateQuestionnaireSettings(
  _prev: QuestionnaireActionState,
  formData: FormData
): Promise<QuestionnaireActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);

  const questionnaire_id = Number(formData.get("questionnaire_id"));
  const description =
    String(formData.get("description") || "").trim() || null;
  const is_active = String(formData.get("is_active") || "") === "1";
  const availableFromRaw =
    String(formData.get("available_from") || "").trim() || null;
  const availableUntilRaw =
    String(formData.get("available_until") || "").trim() || null;
  const available_from = availableFromRaw
    ? new Date(availableFromRaw).toISOString()
    : null;
  const available_until = availableUntilRaw
    ? new Date(availableUntilRaw).toISOString()
    : null;

  if (!questionnaire_id) {
    return { error: "Invalid questionnaire." };
  }

  if (
    (availableFromRaw && Number.isNaN(new Date(availableFromRaw).getTime())) ||
    (availableUntilRaw && Number.isNaN(new Date(availableUntilRaw).getTime()))
  ) {
    return { error: "Invalid availability date." };
  }

  if (
    available_from &&
    available_until &&
    new Date(available_until) < new Date(available_from)
  ) {
    return { error: "Availability end must be after start." };
  }

  const { error } = await supabase
    .from("questionnaires")
    .update({
      description,
      is_active,
      available_from,
      available_until,
    })
    .eq("questionnaire_id", questionnaire_id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "UPDATE_QUESTIONNAIRE",
      action_type: "UPDATE",
      table_name: "questionnaires",
      record_id: questionnaire_id,
      description: `Updated questionnaire settings`,
      ip_address: await getIp(),
    })
  );

  revalidateQuestionnairePaths(questionnaire_id);
  return { success: "Questionnaire settings saved." };
}

export async function toggleQuestionnaireStatus(
  _prev: QuestionnaireActionState,
  formData: FormData
): Promise<QuestionnaireActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);
  const questionnaire_id = Number(formData.get("questionnaire_id"));
  const is_active = String(formData.get("is_active") || "") === "1";

  if (!questionnaire_id) {
    return { error: "Invalid questionnaire." };
  }

  const { error } = await supabase
    .from("questionnaires")
    .update({ is_active })
    .eq("questionnaire_id", questionnaire_id);

  if (error) return { error: error.message };

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: is_active ? "ENABLE_QUESTIONNAIRE" : "DISABLE_QUESTIONNAIRE",
      action_type: "UPDATE",
      table_name: "questionnaires",
      record_id: questionnaire_id,
      ip_address: await getIp(),
    })
  );

  revalidateQuestionnairePaths(questionnaire_id);
  return {
    success: is_active ? "Questionnaire enabled." : "Questionnaire disabled.",
  };
}

export async function createQuestion(
  _prev: QuestionnaireActionState,
  formData: FormData
): Promise<QuestionnaireActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);

  const questionnaire_id = Number(formData.get("questionnaire_id"));
  const question_text = String(formData.get("question_text") || "").trim();
  const response_type = String(formData.get("response_type") || "Likert Scale");
  const reverse_scored = String(formData.get("reverse_scored") || "") === "1";
  const is_required = String(formData.get("is_required") || "1") === "1";
  const orderRaw = String(formData.get("question_order") || "").trim();
  const scaleOptionsRaw = String(formData.get("scale_options") || "").trim();

  if (!questionnaire_id || !question_text) {
    return { error: "Question text is required." };
  }

  const allowed = ["Likert Scale", "Number", "Hours", "Yes/No"];
  if (!allowed.includes(response_type)) {
    return { error: "Invalid response type." };
  }

  let scale_options: ReturnType<typeof parseScaleOptionsField> = null;
  if (supportsCustomScaleOptions(response_type as "Likert Scale" | "Number" | "Hours" | "Yes/No")) {
    if (scaleOptionsRaw) {
      scale_options = parseScaleOptionsField(scaleOptionsRaw);
      if (!scale_options) {
        return { error: "Invalid response choices." };
      }
      const scaleError = validateScaleOptions(scale_options);
      if (scaleError) {
        return { error: scaleError };
      }
    }
  }

  let question_order = orderRaw ? Number(orderRaw) : NaN;
  if (!orderRaw || Number.isNaN(question_order) || question_order < 1) {
    const { data: last } = await supabase
      .from("questions")
      .select("question_order")
      .eq("questionnaire_id", questionnaire_id)
      .order("question_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    question_order = (last?.question_order ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from("questions")
    .insert({
      questionnaire_id,
      question_text,
      question_order,
      response_type,
      reverse_scored,
      is_required,
      is_active: true,
      scale_options,
      created_by: user.id,
    })
    .select("question_id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Question order already exists for this questionnaire." };
    }
    return { error: error.message };
  }

  await syncQuestionnaireQuestionCount(supabase, questionnaire_id);

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "CREATE_QUESTION",
      action_type: "CREATE",
      table_name: "questions",
      record_id: data.question_id,
      description: question_text.slice(0, 120),
      ip_address: await getIp(),
    })
  );

  revalidateQuestionnairePaths(questionnaire_id);
  return { success: "Question added." };
}

export async function updateQuestion(
  _prev: QuestionnaireActionState,
  formData: FormData
): Promise<QuestionnaireActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);

  const question_id = Number(formData.get("question_id"));
  const questionnaire_id = Number(formData.get("questionnaire_id"));
  const question_text = String(formData.get("question_text") || "").trim();
  const response_type = String(formData.get("response_type") || "Likert Scale");
  const reverse_scored = String(formData.get("reverse_scored") || "") === "1";
  const is_required = String(formData.get("is_required") || "") === "1";
  const is_active = String(formData.get("is_active") || "") === "1";
  const question_order = Number(formData.get("question_order"));
  const scaleOptionsRaw = String(formData.get("scale_options") || "").trim();

  if (!question_id || !questionnaire_id || !question_text) {
    return { error: "Question text is required." };
  }

  if (Number.isNaN(question_order) || question_order < 1) {
    return { error: "Question order must be at least 1." };
  }

  const allowed = ["Likert Scale", "Number", "Hours", "Yes/No"];
  if (!allowed.includes(response_type)) {
    return { error: "Invalid response type." };
  }

  let scale_options: ReturnType<typeof parseScaleOptionsField> = null;
  if (supportsCustomScaleOptions(response_type as "Likert Scale" | "Number" | "Hours" | "Yes/No")) {
    if (scaleOptionsRaw) {
      scale_options = parseScaleOptionsField(scaleOptionsRaw);
      if (!scale_options) {
        return { error: "Invalid response choices." };
      }
      const scaleError = validateScaleOptions(scale_options);
      if (scaleError) {
        return { error: scaleError };
      }
    }
  }

  const { error } = await supabase
    .from("questions")
    .update({
      question_text,
      response_type,
      reverse_scored,
      is_required,
      is_active,
      question_order,
      scale_options,
    })
    .eq("question_id", question_id)
    .eq("questionnaire_id", questionnaire_id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Question order already exists for this questionnaire." };
    }
    return { error: error.message };
  }

  await syncQuestionnaireQuestionCount(supabase, questionnaire_id);

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "UPDATE_QUESTION",
      action_type: "UPDATE",
      table_name: "questions",
      record_id: question_id,
      description: question_text.slice(0, 120),
      ip_address: await getIp(),
    })
  );

  revalidateQuestionnairePaths(questionnaire_id);
  return { success: "Question updated." };
}

export async function toggleQuestionStatus(
  _prev: QuestionnaireActionState,
  formData: FormData
): Promise<QuestionnaireActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);
  const question_id = Number(formData.get("question_id"));
  const questionnaire_id = Number(formData.get("questionnaire_id"));
  const is_active = String(formData.get("is_active") || "") === "1";

  if (!question_id || !questionnaire_id) {
    return { error: "Invalid question." };
  }

  const { error } = await supabase
    .from("questions")
    .update({ is_active })
    .eq("question_id", question_id);

  if (error) return { error: error.message };

  await syncQuestionnaireQuestionCount(supabase, questionnaire_id);

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: is_active ? "ACTIVATE_QUESTION" : "DEACTIVATE_QUESTION",
      action_type: "UPDATE",
      table_name: "questions",
      record_id: question_id,
      ip_address: await getIp(),
    })
  );

  revalidateQuestionnairePaths(questionnaire_id);
  return {
    success: is_active ? "Question activated." : "Question deactivated.",
  };
}

export async function deleteQuestion(
  _prev: QuestionnaireActionState,
  formData: FormData
): Promise<QuestionnaireActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);
  const question_id = Number(formData.get("question_id"));
  const questionnaire_id = Number(formData.get("questionnaire_id"));

  if (!question_id || !questionnaire_id) {
    return { error: "Invalid question." };
  }

  const { data: existing } = await supabase
    .from("questions")
    .select("question_id, question_text")
    .eq("question_id", question_id)
    .eq("questionnaire_id", questionnaire_id)
    .maybeSingle();

  if (!existing) {
    return { error: "Question not found." };
  }

  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("question_id", question_id)
    .eq("questionnaire_id", questionnaire_id);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "This question has student answers and cannot be deleted. Deactivate it instead.",
      };
    }
    return { error: error.message };
  }

  await syncQuestionnaireQuestionCount(supabase, questionnaire_id);

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "DELETE_QUESTION",
      action_type: "DELETE",
      table_name: "questions",
      record_id: question_id,
      description: (existing.question_text ?? "").slice(0, 120),
      ip_address: await getIp(),
    })
  );

  revalidateQuestionnairePaths(questionnaire_id);
  return { success: "Question deleted." };
}

export async function moveQuestionOrder(
  _prev: QuestionnaireActionState,
  formData: FormData
): Promise<QuestionnaireActionState> {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const question_id = Number(formData.get("question_id"));
  const questionnaire_id = Number(formData.get("questionnaire_id"));
  const direction = String(formData.get("direction") || "");

  if (!question_id || !questionnaire_id || !["up", "down"].includes(direction)) {
    return { error: "Invalid reorder request." };
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("question_id, question_order")
    .eq("questionnaire_id", questionnaire_id)
    .order("question_order", { ascending: true });

  const list = questions ?? [];
  const index = list.findIndex((q) => q.question_id === question_id);
  if (index < 0) return { error: "Question not found." };

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= list.length) {
    return { success: "Already at the edge." };
  }

  const current = list[index];
  const neighbor = list[swapIndex];

  // Temporary unique order to avoid unique constraint clash
  const tempOrder = Math.max(...list.map((q) => q.question_order)) + 1000;

  const { error: e1 } = await supabase
    .from("questions")
    .update({ question_order: tempOrder })
    .eq("question_id", current.question_id);
  if (e1) return { error: e1.message };

  const { error: e2 } = await supabase
    .from("questions")
    .update({ question_order: current.question_order })
    .eq("question_id", neighbor.question_id);
  if (e2) return { error: e2.message };

  const { error: e3 } = await supabase
    .from("questions")
    .update({ question_order: neighbor.question_order })
    .eq("question_id", current.question_id);
  if (e3) return { error: e3.message };

  revalidateQuestionnairePaths(questionnaire_id);
  return { success: "Question order updated." };
}
