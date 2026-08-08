import { Suspense } from "react";
import { ActivityIcon } from "lucide-react";

import { GuidanceStudentMonitoring } from "@/components/guidance/guidance-student-monitoring";
import { MonitoringWeekControls } from "@/components/guidance/monitoring-week-controls";
import { PageHeading } from "@/components/layout/page-heading";
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
      <PageHeading
        title="Student Monitoring"
        description="Open weekly monitoring for students and review results across all departments."
        icon={ActivityIcon}
      />
      <MonitoringWeekControls term={term} />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <GuidanceStudentMonitoring rows={rows} departments={departments} />
      </Suspense>
    </div>
  );
}
