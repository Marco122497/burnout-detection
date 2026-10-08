import { Suspense } from "react";

import { QuestionnairesTabs } from "@/components/guidance/questionnaires-tabs";
import { PageHeading } from "@/components/layout/page-heading";
import { getOtherAdminCanEditQuestions } from "@/lib/app-settings";
import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
import { requireRole } from "@/lib/auth/session";
import {
  getQuestionnaires,
  getQuestionsForQuestionnaire,
} from "@/lib/guidance/questionnaires";

export const metadata = {
  title: "Questionnaires",
};

export default async function GuidanceQuestionnairesPage() {
  const { supabase, user } = await requireRole(["Guidance Counselor"]);
  const canEdit =
    isSuperadminEmail(user.email) ||
    (await getOtherAdminCanEditQuestions(supabase));
  const questionnaires = await getQuestionnaires(supabase);
  const items = await Promise.all(
    questionnaires.map(async (questionnaire) => ({
      questionnaire,
      questions: await getQuestionsForQuestionnaire(
        supabase,
        questionnaire.questionnaire_id
      ),
    }))
  );

  return (
    <div className="space-y-6">
      <PageHeading
        title="Questionnaires"
        description={
          canEdit
            ? "Configure Stress Level, Academic Workload, Study Time, and Sleep Hours forms."
            : "View Stress Level, Academic Workload, Study Time, and Sleep Hours questions."
        }
      />
      <Suspense
        fallback={
          <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
        }
      >
        <QuestionnairesTabs items={items} canEdit={canEdit} />
      </Suspense>
    </div>
  );
}
