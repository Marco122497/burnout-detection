
import { OpenaiLlmSettings } from "@/components/guidance/openai-llm-settings";
import { ReportSignatorySettings } from "@/components/guidance/report-signatory-settings";
import { PageHeading } from "@/components/layout/page-heading";
import {
  getOpenaiLlmEnabled,
  getSchoolAdministratorSignatory,
} from "@/lib/app-settings";
import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Settings",
};

export default async function GuidanceSettingsPage() {
  const { supabase, user } = await requireRole(["Guidance Counselor"]);
  const canManageOpenaiLlm = isSuperadminEmail(user.email);
  const [schoolAdministrator, openaiLlmEnabled] = await Promise.all([
    getSchoolAdministratorSignatory(supabase),
    canManageOpenaiLlm ? getOpenaiLlmEnabled(supabase) : Promise.resolve(false),
  ]);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Settings"
        description={
          canManageOpenaiLlm
            ? "Configure report signatories, OpenAI LLM wording, and other Guidance preferences."
            : "Configure report signatories and other Guidance preferences."
        }
      />
      {canManageOpenaiLlm ? (
        <OpenaiLlmSettings enabled={openaiLlmEnabled} />
      ) : null}
      <ReportSignatorySettings schoolAdministrator={schoolAdministrator} />
    </div>
  );
}
