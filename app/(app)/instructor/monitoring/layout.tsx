import { Suspense } from "react";

import { InstructorMonitoringSplit } from "@/components/instructor/instructor-monitoring-split";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getUserEmails } from "@/lib/guidance/queries";
import {
  getDepartmentName,
  getInstructorStudentRows,
} from "@/lib/instructor/queries";

export default async function InstructorMonitoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <PageHeading
          title="Student Monitoring"
          description={`Monitor students in your assigned department${departmentName ? ` (${departmentName})` : ""} only.`}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Suspense
          fallback={
            <div className="h-full min-h-0 flex-1 animate-pulse rounded-xl bg-muted/60" />
          }
        >
          <InstructorMonitoringSplit rows={rows}>
            {children}
          </InstructorMonitoringSplit>
        </Suspense>
      </div>
    </div>
  );
}
