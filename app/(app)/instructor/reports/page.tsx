
import { InstructorReportsPanel } from "@/components/instructor/instructor-reports";
import { PageHeading } from "@/components/layout/page-heading";
import { getSchoolAdministratorSignatory } from "@/lib/app-settings";
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
import { resolveReportDateRange, resolveReportWeek } from "@/lib/reports-range";
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
    from?: string;
    to?: string;
    week?: string;
  }>;
}) {
  const { supabase, profile } = await requireRole(["Instructor"]);
  const params = await searchParams;
  const reportType = resolveInstructorReportType(params.type);
  const { from, to } = resolveReportDateRange(params);

  const term = await getActiveTerm(supabase);
  const openWeek = term ? getCurrentWeekNumber(term) : 1;
  const selectedWeek = resolveReportWeek(params.week, openWeek);

  const [rows, departmentName, weeklyTrends, schoolAdministrator] =
    await Promise.all([
      getInstructorStudentRows(supabase, profile.department_id, selectedWeek),
      getDepartmentName(supabase, profile.department_id),
      getDepartmentWeeklySeries(supabase, profile.department_id, { from, to }),
      getSchoolAdministratorSignatory(supabase),
    ]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeading
          title="Reports"
          description="Choose a monitoring week, then print or export the burnout breakdown for that week."
        />
      </div>
      <InstructorReportsPanel
        rows={rows}
        weeklyTrends={weeklyTrends}
        currentWeek={selectedWeek}
        departmentName={departmentName}
        reportType={reportType}
        week={selectedWeek}
        maxWeek={openWeek}
        preparedBy={buildFormalName(profile) || profile.role}
        preparedRole={profile.role}
        schoolAdministratorName={schoolAdministrator.name}
        schoolAdministratorTitle={schoolAdministrator.title}
      />
    </div>
  );
}
