import { WeeklyMonitoringForm } from "@/components/student/weekly-monitoring-form";
import { requireRole } from "@/lib/auth/session";
import { getWeeklyMonitoringSections } from "@/lib/student/questionnaires";
import { getLatestBurnoutSnapshot } from "@/lib/student/queries";

export default async function StudentMonitoringPage() {
  const { supabase, user } = await requireRole(["Student"]);
  const [snapshot, sections] = await Promise.all([
    getLatestBurnoutSnapshot(supabase, user.id),
    getWeeklyMonitoringSections(supabase),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Student module</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Weekly Monitoring
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One consolidated form: PSS, Academic Workload, Study Time, and Sleep
          Hours. Results are scored, normalized, and predicted automatically.
        </p>
      </div>
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
