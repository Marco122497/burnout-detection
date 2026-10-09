
import { ForgotPasswordSettings } from "@/components/guidance/forgot-password-settings";
import { OpenaiLlmSettings } from "@/components/guidance/openai-llm-settings";
import { OtherAdminAccessSettings } from "@/components/guidance/other-admin-access-settings";
import { ReportSignatorySettings } from "@/components/guidance/report-signatory-settings";
import { PageHeading } from "@/components/layout/page-heading";
import {
  getForgotPasswordEnabled,
  getOpenaiLlmEnabled,
  getOtherAdminCanEditQuestions,
  getReportSignatories,
} from "@/lib/app-settings";
import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Settings",
};

export default async function GuidanceSettingsPage() {
  const { supabase, user } = await requireRole(["Guidance Counselor"]);
  const canManageSettings = isSuperadminEmail(user.email);
  const [
    signatories,
    openaiLlmEnabled,
    forgotPasswordEnabled,
    otherAdminCanEditQuestions,
  ] = await Promise.all([
    getReportSignatories(supabase),
    canManageSettings ? getOpenaiLlmEnabled(supabase) : Promise.resolve(false),
    canManageSettings
      ? getForgotPasswordEnabled(supabase)
      : Promise.resolve(false),
    canManageSettings
      ? getOtherAdminCanEditQuestions(supabase)
      : Promise.resolve(false),
  ]);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Settings"
        description={
          canManageSettings
            ? "Configure report signatories, other admin access, forgot password, OpenAI LLM wording, and other Guidance preferences."
            : "Configure report signatories and other Guidance preferences."
        }
      />
      {canManageSettings ? (
        <OtherAdminAccessSettings
          canEditQuestions={otherAdminCanEditQuestions}
        />
      ) : null}
      {canManageSettings ? (
        <ForgotPasswordSettings enabled={forgotPasswordEnabled} />
      ) : null}
      {canManageSettings ? (
        <OpenaiLlmSettings enabled={openaiLlmEnabled} />
      ) : null}
      <ReportSignatorySettings
        schoolAdministrator={signatories.schoolAdministrator}
        guidanceCounselor={signatories.guidanceCounselor}
      />
    </div>
  );
}
