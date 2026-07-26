import { GuidanceReportsPanel } from "@/components/guidance/guidance-reports";
import { requireRole } from "@/lib/auth/session";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";
import { getDepartments } from "@/lib/guidance/queries";
import {
  getGuidanceStudentRows,
  getInstructorMonitoringRows,
} from "@/lib/guidance/monitoring";

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
      <div>
        <p className="text-sm font-medium text-primary">Reports</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Guidance reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate university, department, student, weekly, and instructor
          reports. Export as Excel (CSV) or PDF.
        </p>
      </div>
      <GuidanceReportsPanel
        rows={rows}
        instructors={instructors}
        departments={departments}
        currentWeek={currentWeek}
      />
    </div>
  );
}
