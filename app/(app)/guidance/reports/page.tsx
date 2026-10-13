
import { GuidanceReportsPanel } from "@/components/guidance/guidance-reports";
import { PageHeading } from "@/components/layout/page-heading";
import { getReportSignatories } from "@/lib/app-settings";
import { requireRole } from "@/lib/auth/session";
import { getGuidanceStudentRows } from "@/lib/guidance/monitoring";
import { getDepartments } from "@/lib/guidance/queries";
import {
  GUIDANCE_REPORT_TYPES,
  type GuidanceReportType,
} from "@/lib/report-types";
import { resolveReportWeek } from "@/lib/reports-range";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";
import type { Department } from "@/lib/auth/roles";

export const metadata = {
  title: "Reports",
};

function resolveGuidanceReportType(value: string | undefined): GuidanceReportType {
  const match = GUIDANCE_REPORT_TYPES.find((item) => item.id === value);
  return match?.id ?? "year-level";
}

function resolveDepartment(
  value: string | undefined,
  departments: Department[]
) {
  if (!value || value === "all") return null;
  const id = Number(value);
  if (!Number.isFinite(id)) return null;
  return departments.find((department) => department.department_id === id) ?? null;
}

export default async function GuidanceReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    week?: string;
    department?: string;
  }>;
}) {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const params = await searchParams;
  const reportType = resolveGuidanceReportType(params.type);

  const [term, departments, signatories] = await Promise.all([
    getActiveTerm(supabase),
    getDepartments(supabase),
    getReportSignatories(supabase),
  ]);
  const openWeek = term ? getCurrentWeekNumber(term) : 1;
  const selectedWeek = resolveReportWeek(params.week, openWeek);
  const selectedDepartment = resolveDepartment(params.department, departments);
  const rows = await getGuidanceStudentRows(supabase, selectedWeek);
  const reportRows = selectedDepartment
    ? rows.filter((row) => row.department_id === selectedDepartment.department_id)
    : rows;
  const reportDepartments = selectedDepartment
    ? [selectedDepartment]
    : departments;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeading
          title="Guidance reports"
          description="Choose a monitoring week and department, then print or export the burnout breakdown."
        />
      </div>
      <GuidanceReportsPanel
        rows={reportRows}
        departments={reportDepartments}
        departmentOptions={departments.map((department) => ({
          id: String(department.department_id),
          label: department.department_name,
        }))}
        department={
          selectedDepartment ? String(selectedDepartment.department_id) : "all"
        }
        departmentName={selectedDepartment?.department_name ?? null}
        currentWeek={selectedWeek}
        reportType={reportType}
        week={selectedWeek}
        maxWeek={openWeek}
        schoolAdministratorName={signatories.schoolAdministrator.name}
        schoolAdministratorTitle={signatories.schoolAdministrator.title}
        guidanceCounselorName={signatories.guidanceCounselor.name}
        guidanceCounselorTitle={signatories.guidanceCounselor.title}
      />
    </div>
  );
}
