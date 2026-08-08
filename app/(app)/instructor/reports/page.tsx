import { FileBarChartIcon } from "lucide-react";

import { InstructorReportsPanel } from "@/components/instructor/instructor-reports";
import { PageHeading } from "@/components/layout/page-heading";
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
      <PageHeading
        title="Reports"
        description="Generate department burnout, weekly monitoring, and student assessment reports. Export as PDF or Excel (CSV)."
        icon={FileBarChartIcon}
      />
      <InstructorReportsPanel
        rows={rows}
        currentWeek={currentWeek}
        departmentName={departmentName}
      />
    </div>
  );
}
