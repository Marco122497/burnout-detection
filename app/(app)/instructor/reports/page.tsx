
import { InstructorReportsPanel } from "@/components/instructor/instructor-reports";
import { PageHeading } from "@/components/layout/page-heading";
import { getReportSignatories } from "@/lib/app-settings";
import { requireRole } from "@/lib/auth/session";
import { buildFormalName } from "@/lib/auth/roles";
import {
  getDepartmentName,
  getDepartmentWeeklySeries,
  getInstructorDepartmentIds,
  getInstructorDepartmentOptions,
  getInstructorStudentRows,
} from "@/lib/instructor/queries";
import {
  INSTRUCTOR_REPORT_TYPES,
  type InstructorReportType,
} from "@/lib/report-types";
import {
  resolveReportPeriod,
  resolveReportYearLevel,
} from "@/lib/reports-range";
import { formatYearLevel } from "@/lib/utils";
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
  searchParams: Promise<{
    type?: string;
    period?: string;
    month?: string;
    from?: string;
    to?: string;
    week?: string;
    department?: string;
    year?: string;
  }>;
}) {
  const { supabase, user, profile } = await requireRole(["Instructor"]);
  const departmentIds = await getInstructorDepartmentIds(
    supabase,
    user.id,
    profile.department_id
  );
  const params = await searchParams;
  const reportType = resolveInstructorReportType(params.type);

  const term = await getActiveTerm(supabase);
  const openWeek = term ? getCurrentWeekNumber(term) : 1;
  const period = resolveReportPeriod(params, openWeek);
  const yearLevel = resolveReportYearLevel(params.year);
  const departmentOptions = await getInstructorDepartmentOptions(
    supabase,
    departmentIds
  );
  const selectedDepartmentId = Number(params.department);
  const selectedDepartment = departmentOptions.find(
    (department) => department.department_id === selectedDepartmentId
  );
  const scopedDepartmentIds = selectedDepartment
    ? [selectedDepartment.department_id]
    : departmentIds;

  const [allRows, departmentName, weeklyTrends, signatories] = await Promise.all([
    getInstructorStudentRows(
      supabase,
      scopedDepartmentIds,
      period.week,
      period.range ?? undefined
    ),
    getDepartmentName(supabase, scopedDepartmentIds),
    getDepartmentWeeklySeries(
      supabase,
      scopedDepartmentIds,
      period.mode === "month" || period.mode === "range"
        ? { from: period.from, to: period.to }
        : undefined
    ),
    getReportSignatories(supabase),
  ]);
  const rows =
    yearLevel != null
      ? allRows.filter((row) => row.year_level === yearLevel)
      : allRows;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeading
          title="Reports"
          description={
            departmentOptions.length > 0
              ? "Choose a period (weekly, monthly, date range, or general), year level, and department, then print or export the burnout breakdown."
              : "Choose a period (weekly, monthly, date range, or general) and year level, then print or export the burnout breakdown."
          }
        />
      </div>
      <InstructorReportsPanel
        rows={rows}
        weeklyTrends={weeklyTrends}
        period={period}
        yearLevel={yearLevel != null ? String(yearLevel) : "all"}
        yearLevelLabel={yearLevel != null ? formatYearLevel(yearLevel) : null}
        departmentName={departmentName}
        departmentOptions={departmentOptions.map((department) => ({
          id: String(department.department_id),
          label: department.department_name,
        }))}
        department={
          selectedDepartment ? String(selectedDepartment.department_id) : "all"
        }
        reportType={reportType}
        maxWeek={openWeek}
        preparedBy={buildFormalName(profile) || profile.role}
        preparedRole={profile.role}
        schoolAdministratorName={signatories.schoolAdministrator.name}
        schoolAdministratorTitle={signatories.schoolAdministrator.title}
        guidanceCounselorName={signatories.guidanceCounselor.name}
        guidanceCounselorTitle={signatories.guidanceCounselor.title}
      />
    </div>
  );
}
