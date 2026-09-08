import { FileBarChartIcon } from "lucide-react";

import { GuidanceReportsPanel } from "@/components/guidance/guidance-reports";
import { PageHeading } from "@/components/layout/page-heading";
import { getSchoolAdministratorSignatory } from "@/lib/app-settings";
import { requireRole } from "@/lib/auth/session";
import { getGuidanceStudentRows } from "@/lib/guidance/monitoring";
import { getDepartments } from "@/lib/guidance/queries";
import {
  GUIDANCE_REPORT_TYPES,
  type GuidanceReportType,
} from "@/lib/report-types";
import { resolveReportDateRange } from "@/lib/reports-range";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";

export const metadata = {
  title: "Reports",
};

function resolveGuidanceReportType(value: string | undefined): GuidanceReportType {
  const match = GUIDANCE_REPORT_TYPES.find((item) => item.id === value);
  return match?.id ?? "year-level";
}

export default async function GuidanceReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string; to?: string }>;
}) {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const params = await searchParams;
  const reportType = resolveGuidanceReportType(params.type);
  const { from, to } = resolveReportDateRange(params);

  const [rows, term, departments, schoolAdministrator] = await Promise.all([
    getGuidanceStudentRows(supabase),
    getActiveTerm(supabase),
    getDepartments(supabase),
    getSchoolAdministratorSignatory(supabase),
  ]);
  const currentWeek = term ? getCurrentWeekNumber(term) : null;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeading
          title="Guidance reports"
          description="Filter by date range, then print or export formal reports with burnout breakdown by year level."
          icon={FileBarChartIcon}
        />
      </div>
      <GuidanceReportsPanel
        rows={rows}
        departments={departments}
        currentWeek={currentWeek}
        reportType={reportType}
        from={from}
        to={to}
        schoolAdministratorName={schoolAdministrator.name}
        schoolAdministratorTitle={schoolAdministrator.title}
      />
    </div>
  );
}
