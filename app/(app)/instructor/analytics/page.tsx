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
    <InstructorAnalyticsView data={data} departmentName={departmentName} />
  );
}
