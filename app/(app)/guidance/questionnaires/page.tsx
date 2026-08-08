import { ClipboardListIcon } from "lucide-react";

import { QuestionnairesList } from "@/components/guidance/questionnaires-manager";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getQuestionnaires } from "@/lib/guidance/questionnaires";

export default async function GuidanceQuestionnairesPage() {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const questionnaires = await getQuestionnaires(supabase);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Questionnaires"
        description="Configure PSS, Academic Workload, Study Time, and Sleep Hours forms."
        icon={ClipboardListIcon}
      />
      <QuestionnairesList questionnaires={questionnaires} />
    </div>
  );
}
