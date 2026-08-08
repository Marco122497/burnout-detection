import { ChartPieIcon } from "lucide-react";

import { InstructorAnalyticsView } from "@/components/instructor/instructor-analytics";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import {
  getDepartmentName,
  getDepartmentWeeklySeries,
  getInstructorAnalytics,
  getInstructorStudentRows,
} from "@/lib/instructor/queries";

export default async function InstructorAnalyticsPage() {
  const { supabase, profile } = await requireRole(["Instructor"]);
  const [rows, weeklyTrends, departmentName] = await Promise.all([
    getInstructorStudentRows(supabase, profile.department_id),
    getDepartmentWeeklySeries(supabase, profile.department_id),
    getDepartmentName(supabase, profile.department_id),
  ]);
  const data = getInstructorAnalytics(rows, weeklyTrends);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Instructor Burnout Analytics"
        description={`Class overview, risk distribution, trends, and students needing attention${departmentName ? ` for ${departmentName}` : ""}.`}
        icon={ChartPieIcon}
      />
      <InstructorAnalyticsView data={data} departmentName={departmentName} />
    </div>
  );
}
