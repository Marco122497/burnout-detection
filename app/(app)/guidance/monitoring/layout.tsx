import { Suspense } from "react";

import { GuidanceMonitoringSplit } from "@/components/guidance/guidance-monitoring-split";
import { MonitoringWeekControls } from "@/components/guidance/monitoring-week-controls";
import { PageHeading } from "@/components/layout/page-heading";
import { getOtherAdminCanControlMonitoring } from "@/lib/app-settings";
import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
import { requireRole } from "@/lib/auth/session";
import { getDepartments, getUserEmails } from "@/lib/guidance/queries";
import { getGuidanceStudentRows } from "@/lib/guidance/monitoring";
import {
  getActiveTerm,
  getCurrentWeekNumber,
  isMonitoringOpen,
} from "@/lib/student/terms";

/** Bulk auto-fill can write many monitoring rows in one request. */
export const maxDuration = 120;

export default async function GuidanceMonitoringLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireRole(["Guidance Counselor"]);
  const viewerIsSuperadmin = isSuperadminEmail(user.email);
  const [rows, departments, term, emails, otherAdminsCanControl] =
    await Promise.all([
      getGuidanceStudentRows(supabase),
      getDepartments(supabase),
      getActiveTerm(supabase),
      getUserEmails(),
      viewerIsSuperadmin
        ? Promise.resolve(true)
        : getOtherAdminCanControlMonitoring(supabase),
    ]);
  const showMonitoringControl = viewerIsSuperadmin || otherAdminsCanControl;
  const rowsWithEmail = rows.map((row) => ({
    ...row,
    email: emails[row.id] ?? null,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <PageHeading
          title="Student Monitoring"
          description="Open weekly monitoring for students and review results across all departments."
          actions={
            showMonitoringControl ? (
              <MonitoringWeekControls term={term} />
            ) : null
          }
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <Suspense
          fallback={
            <div className="h-full min-h-0 flex-1 animate-pulse rounded-xl bg-muted/60" />
          }
        >
          <GuidanceMonitoringSplit
            rows={rowsWithEmail}
            departments={departments}
            currentWeek={term ? getCurrentWeekNumber(term) : 1}
            monitoringOpen={isMonitoringOpen(term)}
            canFillWeek={viewerIsSuperadmin}
          >
            {children}
          </GuidanceMonitoringSplit>
        </Suspense>
      </div>
    </div>
  );
}
