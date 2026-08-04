import { Suspense } from "react";

import { StudentMonitoringTable } from "@/components/instructor/student-monitoring-table";
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
      <div>
        <p className="text-sm font-medium text-primary">Instructor module</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Student Monitoring
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor students in your assigned department
          {departmentName ? ` (${departmentName})` : ""} only.
        </p>
      </div>
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
