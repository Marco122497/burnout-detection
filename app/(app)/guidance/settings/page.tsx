
import { GuidanceSettingsPanel } from "@/components/guidance/guidance-settings-panel";
import { PageHeading } from "@/components/layout/page-heading";
import {
  getForgotPasswordEnabled,
  getOpenaiLlmEnabled,
  getOtherAdminCanControlMonitoring,
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
    otherAdminCanControlMonitoring,
  ] = await Promise.all([
    getReportSignatories(supabase),
    canManageSettings ? getOpenaiLlmEnabled(supabase) : Promise.resolve(false),
    canManageSettings
      ? getForgotPasswordEnabled(supabase)
      : Promise.resolve(false),
    canManageSettings
      ? getOtherAdminCanEditQuestions(supabase)
      : Promise.resolve(false),
    canManageSettings
      ? getOtherAdminCanControlMonitoring(supabase)
      : Promise.resolve(true),
  ]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <PageHeading
        title="Settings"
        description={
          canManageSettings
            ? "Switches and report names."
            : "Report names."
        }
      />
      <GuidanceSettingsPanel
        settings={{
          canManage: canManageSettings,
          otherAdminCanEditQuestions,
          otherAdminCanControlMonitoring,
          forgotPasswordEnabled,
          openaiLlmEnabled,
          signatories,
        }}
      />
    </div>
  );
}
