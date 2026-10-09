
import { InstructorReportsPanel } from "@/components/instructor/instructor-reports";
import { PageHeading } from "@/components/layout/page-heading";
import { getReportSignatories } from "@/lib/app-settings";
import { requireRole } from "@/lib/auth/session";
import { buildFormalName } from "@/lib/auth/roles";
import {
  getDepartmentName,
  getDepartmentWeeklySeries,
  getInstructorDepartmentIds,
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
  const { supabase, user, profile } = await requireRole(["Instructor"]);
  const departmentIds = await getInstructorDepartmentIds(
    supabase,
    user.id,
    profile.department_id
  );
  const params = await searchParams;
  const reportType = resolveInstructorReportType(params.type);
  const { from, to } = resolveReportDateRange(params);

  const term = await getActiveTerm(supabase);
  const openWeek = term ? getCurrentWeekNumber(term) : 1;
  const selectedWeek = resolveReportWeek(params.week, openWeek);

  const [rows, departmentName, weeklyTrends, signatories] = await Promise.all([
    getInstructorStudentRows(supabase, departmentIds, selectedWeek),
    getDepartmentName(supabase, departmentIds),
    getDepartmentWeeklySeries(supabase, departmentIds, { from, to }),
    getReportSignatories(supabase),
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
        schoolAdministratorName={signatories.schoolAdministrator.name}
        schoolAdministratorTitle={signatories.schoolAdministrator.title}
        guidanceCounselorName={signatories.guidanceCounselor.name}
        guidanceCounselorTitle={signatories.guidanceCounselor.title}
      />
    </div>
  );
}
