import { ClipboardCheckIcon } from "lucide-react";

import { WeeklyMonitoringForm } from "@/components/student/weekly-monitoring-form";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getWeeklyMonitoringSections } from "@/lib/student/questionnaires";
import { getLatestBurnoutSnapshot } from "@/lib/student/queries";
import {
  hasAgreedResearchConsent,
  RESEARCH_CONSENT_VERSION,
} from "@/lib/student/research-consent";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Weekly Monitoring",
};

export default async function StudentMonitoringPage() {
  const { supabase, user, profile } = await requireRole(["Student"]);

  if (!hasAgreedResearchConsent(profile.research_consent_status)) {
    return (
      <div className="space-y-6">
        <PageHeading
          title="Weekly Monitoring"
          description="Informed consent is required before you can complete the weekly monitoring form."
          icon={ClipboardCheckIcon}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Consent required</CardTitle>
            <CardDescription>
              Please complete the electronic informed consent ({RESEARCH_CONSENT_VERSION})
              shown after login. Weekly monitoring unlocks after you agree.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            System registration is not the same as research consent. Your
            answers are only collected for this study after you agree.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [snapshot, sections] = await Promise.all([
    getLatestBurnoutSnapshot(supabase, user.id),
    getWeeklyMonitoringSections(supabase),
  ]);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Weekly Monitoring"
        description="One consolidated form: Stress, Academic Workload, Study Time, and Sleep Hours. Results are scored, normalized, and predicted automatically."
        icon={ClipboardCheckIcon}
      />

      <WeeklyMonitoringForm
        term={snapshot.term}
        currentWeek={snapshot.currentWeek}
        submittedThisWeek={snapshot.submittedThisWeek}
        monitoringEnabled={snapshot.monitoringEnabled}
        sections={sections}
      />
    </div>
  );
}
