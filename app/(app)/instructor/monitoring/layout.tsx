import { Suspense } from "react";

import { InstructorMonitoringSplit } from "@/components/instructor/instructor-monitoring-split";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getUserEmails } from "@/lib/guidance/queries";
import {
  getDepartmentName,
  getInstructorDepartmentIds,
  getInstructorDepartmentOptions,
  getInstructorStudentRows,
} from "@/lib/instructor/queries";

export default async function InstructorMonitoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, profile } = await requireRole(["Instructor"]);
  const departmentIds = await getInstructorDepartmentIds(
    supabase,
    user.id,
    profile.department_id
  );
  let studentRows: Awaited<ReturnType<typeof getInstructorStudentRows>> = [];
  let departmentName: string | null = null;
  let departments: Awaited<ReturnType<typeof getInstructorDepartmentOptions>> =
    [];
  let emails: Record<string, string> = {};
  try {
    [studentRows, departmentName, departments, emails] = await Promise.all([
      getInstructorStudentRows(supabase, departmentIds),
      getDepartmentName(supabase, departmentIds),
      getInstructorDepartmentOptions(supabase, departmentIds),
      getUserEmails(),
    ]);
  } catch (error) {
    console.error("Instructor monitoring list:", error);
  }
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
          <InstructorMonitoringSplit rows={rows} departments={departments}>
            {children}
          </InstructorMonitoringSplit>
        </Suspense>
      </div>
    </div>
  );
}
