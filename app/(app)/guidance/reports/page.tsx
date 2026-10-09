
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
  searchParams: Promise<{
    type?: string;
    week?: string;
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
  const rows = await getGuidanceStudentRows(supabase, selectedWeek);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeading
          title="Guidance reports"
          description="Choose a monitoring week, then print or export the burnout breakdown for that week."
        />
      </div>
      <GuidanceReportsPanel
        rows={rows}
        departments={departments}
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
