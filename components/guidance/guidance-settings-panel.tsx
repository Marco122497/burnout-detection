"use client";

import { ForgotPasswordSettings } from "@/components/guidance/forgot-password-settings";
import { OpenaiLlmSettings } from "@/components/guidance/openai-llm-settings";
import { OtherAdminAccessSettings } from "@/components/guidance/other-admin-access-settings";
import { ReportSignatorySettings } from "@/components/guidance/report-signatory-settings";
import type { ReportSignatories } from "@/lib/app-settings";

export type GuidanceMenuSettings = {
  canManage: boolean;
  otherAdminCanEditQuestions: boolean;
  forgotPasswordEnabled: boolean;
  openaiLlmEnabled: boolean;
  signatories: ReportSignatories;
};

export function GuidanceSettingsPanel({
  settings,
}: {
  settings: GuidanceMenuSettings;
}) {
  return (
    <div className="space-y-2 [&_[data-slot=card]]:rounded-none [&_[data-slot=card]]:border-0 [&_[data-slot=card]]:bg-transparent [&_[data-slot=card]]:py-0 [&_[data-slot=card]]:shadow-none [&_[data-slot=card-header]]:px-0 [&_[data-slot=card-content]]:px-0">
      {settings.canManage ? (
        <OtherAdminAccessSettings
          canEditQuestions={settings.otherAdminCanEditQuestions}
        />
      ) : null}
      {settings.canManage ? (
        <ForgotPasswordSettings enabled={settings.forgotPasswordEnabled} />
      ) : null}
      {settings.canManage ? (
        <OpenaiLlmSettings enabled={settings.openaiLlmEnabled} />
      ) : null}
      <ReportSignatorySettings
        schoolAdministrator={settings.signatories.schoolAdministrator}
        guidanceCounselor={settings.signatories.guidanceCounselor}
      />
    </div>
  );
}
