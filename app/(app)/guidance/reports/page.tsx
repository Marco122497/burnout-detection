import { FileBarChartIcon } from "lucide-react";

import { GuidanceReportsPanel } from "@/components/guidance/guidance-reports";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";
import { getDepartments } from "@/lib/guidance/queries";
import {
  getGuidanceStudentRows,
  getInstructorMonitoringRows,
} from "@/lib/guidance/monitoring";

export const metadata = {
  title: "Reports",
};

export default async function GuidanceReportsPage() {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const [rows, departments, term] = await Promise.all([
    getGuidanceStudentRows(supabase),
    getDepartments(supabase),
    getActiveTerm(supabase),
  ]);
  const instructors = await getInstructorMonitoringRows(supabase, rows);
  const currentWeek = term ? getCurrentWeekNumber(term) : null;

  return (
    <div className="space-y-6">
      <PageHeading
        title="Guidance reports"
        description="Generate university, department, student, weekly, and instructor reports. Export as Excel (CSV) or PDF."
        icon={FileBarChartIcon}
      />
      <GuidanceReportsPanel
        rows={rows}
        instructors={instructors}
        departments={departments}
        currentWeek={currentWeek}
      />
    </div>
  );
}
