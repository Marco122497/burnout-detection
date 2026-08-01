import { BurnoutHistoryView } from "@/components/student/burnout-history-view";
import { requireRole } from "@/lib/auth/session";
import {
  getLatestBurnoutSnapshot,
  getMonitoringAnswers,
} from "@/lib/student/queries";

export default async function StudentBurnoutPage() {
  const { supabase, user } = await requireRole(["Student"]);
  const snapshot = await getLatestBurnoutSnapshot(supabase, user.id);
  const answers = await getMonitoringAnswers(
    supabase,
    snapshot.history.map((row) => row.monitoring_id)
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Student module</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Assessment History
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review previous assessments, weekly MFBI scores, burnout risk trends,
          and submission history.
        </p>
      </div>
      <BurnoutHistoryView
        stressLevel={snapshot.stress?.stress_level ?? null}
        stressScore={snapshot.stress?.stress_score ?? null}
        history={snapshot.history}
        answers={answers}
      />
    </div>
  );
}
