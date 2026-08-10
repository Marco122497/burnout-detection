import { HistoryIcon } from "lucide-react";

import { BurnoutHistoryView } from "@/components/student/burnout-history-view";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import {
  getLatestBurnoutSnapshot,
  getMonitoringAnswers,
} from "@/lib/student/queries";

export const metadata = {
  title: "Assessment History",
};

export default async function StudentBurnoutPage() {
  const { supabase, user } = await requireRole(["Student"]);
  const snapshot = await getLatestBurnoutSnapshot(supabase, user.id);
  const answers = await getMonitoringAnswers(
    supabase,
    snapshot.history.map((row) => row.monitoring_id)
  );

  return (
    <div className="space-y-6">
      <PageHeading
        title="Assessment History"
        description="Review previous assessments, weekly MFBI scores, burnout risk trends, and submission history."
        icon={HistoryIcon}
      />
      <BurnoutHistoryView
        stressLevel={snapshot.stress?.stress_level ?? null}
        history={snapshot.history}
        answers={answers}
      />
    </div>
  );
}
