import { ClipboardCheckIcon } from "lucide-react";

import { WeeklyMonitoringForm } from "@/components/student/weekly-monitoring-form";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getWeeklyMonitoringSections } from "@/lib/student/questionnaires";
import { getLatestBurnoutSnapshot } from "@/lib/student/queries";
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Purpose & objectives</CardTitle>
          <CardDescription>
            Please read this before you answer the weekly monitoring form.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            This Burnout Detection System helps the Guidance Office support your
            wellness early. Your weekly answers are used to estimate burnout risk
            from stress, academic workload, study time, and sleep.
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <span className="font-medium text-foreground">Purpose:</span>{" "}
              Detect early signs of academic burnout so students can get timely
              guidance and support.
            </li>
            <li>
              <span className="font-medium text-foreground">Objective:</span>{" "}
              Help you reflect on how the past week felt across stress,
              schoolwork, study load, and sleep.
            </li>
            <li>
              <span className="font-medium text-foreground">Objective:</span>{" "}
              Give Guidance Counselors and instructors a clearer view of who may
              need follow-up or referral.
            </li>
            <li>
              <span className="font-medium text-foreground">Objective:</span>{" "}
              Provide personalized recommendations you can use while studying
              this term.
            </li>
          </ul>
          <p>
            Answer honestly based on the past week. There are no right or wrong
            answers.
          </p>
        </CardContent>
      </Card>

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
