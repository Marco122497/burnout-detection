import { notFound } from "next/navigation";

import { QuestionnaireDetailManager } from "@/components/guidance/questionnaires-manager";
import { requireRole } from "@/lib/auth/session";
import {
  getQuestionnaireById,
  getQuestionsForQuestionnaire,
} from "@/lib/guidance/questionnaires";

export default async function GuidanceQuestionnaireDetailPage({
  params,
}: {
  params: Promise<{ questionnaireId: string }>;
}) {
  const { questionnaireId: rawId } = await params;
  const questionnaireId = Number.parseInt(String(rawId), 10);
  if (!Number.isFinite(questionnaireId) || questionnaireId < 1) {
    notFound();
  }

  const { supabase } = await requireRole(["Guidance Counselor"]);
  const [questionnaire, questions] = await Promise.all([
    getQuestionnaireById(supabase, questionnaireId),
    getQuestionsForQuestionnaire(supabase, questionnaireId),
  ]);

  if (!questionnaire) notFound();

  return (
    <QuestionnaireDetailManager
      questionnaire={questionnaire}
      questions={questions}
    />
  );
}
