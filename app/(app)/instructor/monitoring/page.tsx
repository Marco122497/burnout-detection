import { Suspense } from "react";
import { ActivityIcon } from "lucide-react";

import { StudentMonitoringTable } from "@/components/instructor/student-monitoring-table";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getUserEmails } from "@/lib/guidance/queries";
import {
  getDepartmentName,
  getInstructorStudentRows,
} from "@/lib/instructor/queries";

export default async function InstructorMonitoringPage() {
  const { supabase, profile } = await requireRole(["Instructor"]);
  const [studentRows, departmentName, emails] = await Promise.all([
    getInstructorStudentRows(supabase, profile.department_id),
    getDepartmentName(supabase, profile.department_id),
    getUserEmails(),
  ]);
  const rows = studentRows.map((row) => ({
    ...row,
    email: emails[row.id] ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeading
        title="Student Monitoring"
        description={`Monitor students in your assigned department${departmentName ? ` (${departmentName})` : ""} only.`}
        icon={ActivityIcon}
      />
      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-xl bg-muted/60" />
        }
      >
        <StudentMonitoringTable rows={rows} />
      </Suspense>
    </div>
  );
}
