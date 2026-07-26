import { Suspense } from "react";

import { GuidanceStudentMonitoring } from "@/components/guidance/guidance-student-monitoring";
import { MonitoringWeekControls } from "@/components/guidance/monitoring-week-controls";
import { requireRole } from "@/lib/auth/session";
import { getDepartments } from "@/lib/guidance/queries";
import { getGuidanceStudentRows } from "@/lib/guidance/monitoring";
import { getActiveTerm } from "@/lib/student/terms";

export default async function GuidanceMonitoringPage() {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const [rows, departments, term] = await Promise.all([
    getGuidanceStudentRows(supabase),
    getDepartments(supabase),
    getActiveTerm(supabase),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Student Monitoring
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open weekly monitoring for students and review results across all
          departments.
        </p>
      </div>
      <MonitoringWeekControls term={term} />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <GuidanceStudentMonitoring rows={rows} departments={departments} />
      </Suspense>
    </div>
  );
}
