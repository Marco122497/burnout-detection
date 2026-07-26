import { InstructorReportsPanel } from "@/components/instructor/instructor-reports";
import { requireRole } from "@/lib/auth/session";
import {
  getDepartmentName,
  getInstructorStudentRows,
} from "@/lib/instructor/queries";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";

export default async function InstructorReportsPage() {
  const { supabase, profile } = await requireRole(["Instructor"]);
  const [rows, term, departmentName] = await Promise.all([
    getInstructorStudentRows(supabase, profile.department_id),
    getActiveTerm(supabase),
    getDepartmentName(supabase, profile.department_id),
  ]);
  const currentWeek = term ? getCurrentWeekNumber(term) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Instructor module</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Reports
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate department burnout, weekly monitoring, and student assessment
          reports. Export as PDF or Excel (CSV).
        </p>
      </div>
      <InstructorReportsPanel
        rows={rows}
        currentWeek={currentWeek}
        departmentName={departmentName}
      />
    </div>
  );
}
