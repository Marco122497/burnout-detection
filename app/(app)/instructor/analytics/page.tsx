import { InstructorAnalyticsView } from "@/components/instructor/instructor-analytics";
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
      <div>
        <p className="text-sm font-medium text-primary">Instructor module</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Department Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Burnout statistics, average MFBI/stress, weekly trends, and risk
          distribution
          {departmentName ? ` for ${departmentName}` : ""}.
        </p>
      </div>
      <InstructorAnalyticsView data={data} departmentName={departmentName} />
    </div>
  );
}
