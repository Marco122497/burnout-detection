import { SettingsIcon } from "lucide-react";

import { ReportSignatorySettings } from "@/components/guidance/report-signatory-settings";
import { PageHeading } from "@/components/layout/page-heading";
import { getSchoolAdministratorSignatory } from "@/lib/app-settings";
import { requireRole } from "@/lib/auth/session";

export const metadata = {
  title: "Settings",
};

export default async function GuidanceSettingsPage() {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const schoolAdministrator = await getSchoolAdministratorSignatory(supabase);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Settings"
        description="Configure report signatories and other Guidance preferences."
        icon={SettingsIcon}
      />
      <ReportSignatorySettings schoolAdministrator={schoolAdministrator} />
    </div>
  );
}
