
import { OpenaiLlmSettings } from "@/components/guidance/openai-llm-settings";
import { ReportSignatorySettings } from "@/components/guidance/report-signatory-settings";
import { PageHeading } from "@/components/layout/page-heading";
import {
  getOpenaiLlmEnabled,
  getSchoolAdministratorSignatory,
} from "@/lib/app-settings";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Settings",
};

export default async function GuidanceSettingsPage() {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const [schoolAdministrator, openaiLlmEnabled] = await Promise.all([
    getSchoolAdministratorSignatory(supabase),
    getOpenaiLlmEnabled(supabase),
  ]);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Settings"
        description="Configure report signatories, OpenAI LLM wording, and other Guidance preferences."
      />
      <OpenaiLlmSettings enabled={openaiLlmEnabled} />
      <ReportSignatorySettings schoolAdministrator={schoolAdministrator} />
    </div>
  );
}
