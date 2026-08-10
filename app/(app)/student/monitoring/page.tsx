import { ClipboardCheckIcon } from "lucide-react";

import { WeeklyMonitoringForm } from "@/components/student/weekly-monitoring-form";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getWeeklyMonitoringSections } from "@/lib/student/questionnaires";
import { getLatestBurnoutSnapshot } from "@/lib/student/queries";

export const metadata = {
  title: "Weekly Monitoring",
};

export default async function StudentMonitoringPage() {
  const { supabase, user } = await requireRole(["Student"]);
  const [snapshot, sections] = await Promise.all([
    getLatestBurnoutSnapshot(supabase, user.id),
    getWeeklyMonitoringSections(supabase),
  ]);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Weekly Monitoring"
        description="One consolidated form: PSS, Academic Workload, Study Time, and Sleep Hours. Results are scored, normalized, and predicted automatically."
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
