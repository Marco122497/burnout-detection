import { FileBarChartIcon } from "lucide-react";

import { InstructorReportsPanel } from "@/components/instructor/instructor-reports";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { buildFormalName } from "@/lib/auth/roles";
import {
  getDepartmentName,
  getDepartmentWeeklySeries,
  getInstructorStudentRows,
} from "@/lib/instructor/queries";
import {
  INSTRUCTOR_REPORT_TYPES,
  type InstructorReportType,
} from "@/lib/report-types";
import { resolveReportDateRange } from "@/lib/reports-range";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";

export const metadata = {
  title: "Reports",
};

function resolveInstructorReportType(
  value: string | undefined
): InstructorReportType {
  const match = INSTRUCTOR_REPORT_TYPES.find((item) => item.id === value);
  return match?.id ?? "year-level";
}

export default async function InstructorReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string; to?: string }>;
}) {
  const { supabase, profile } = await requireRole(["Instructor"]);
  const params = await searchParams;
  const reportType = resolveInstructorReportType(params.type);
  const { from, to } = resolveReportDateRange(params);

  const [rows, term, departmentName, weeklyTrends] = await Promise.all([
    getInstructorStudentRows(supabase, profile.department_id),
    getActiveTerm(supabase),
    getDepartmentName(supabase, profile.department_id),
    getDepartmentWeeklySeries(supabase, profile.department_id, { from, to }),
  ]);
  const currentWeek = term ? getCurrentWeekNumber(term) : null;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeading
          title="Reports"
          description="Filter by date range, then print or export formal reports with burnout breakdown by year level."
          icon={FileBarChartIcon}
        />
      </div>
      <InstructorReportsPanel
        rows={rows}
        weeklyTrends={weeklyTrends}
        currentWeek={currentWeek}
        departmentName={departmentName}
        reportType={reportType}
        from={from}
        to={to}
        preparedBy={buildFormalName(profile) || profile.role}
        preparedRole={profile.role}
      />
    </div>
  );
}
