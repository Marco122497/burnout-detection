import { QuestionnairesList } from "@/components/guidance/questionnaires-manager";
import { requireRole } from "@/lib/auth/session";
import { getQuestionnaires } from "@/lib/guidance/questionnaires";

export default async function GuidanceQuestionnairesPage() {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const questionnaires = await getQuestionnaires(supabase);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          Questionnaire management
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Questionnaires
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure PSS, Academic Workload, Study Time, and Sleep Hours forms.
        </p>
      </div>
      <QuestionnairesList questionnaires={questionnaires} />
    </div>
  );
}
