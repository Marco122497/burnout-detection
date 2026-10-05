import { InstructorAnalyticsView } from "@/components/instructor/instructor-analytics";
import { requireRole } from "@/lib/auth/session";
import {
  getDepartmentName,
  getDepartmentWeeklySeries,
  getInstructorAnalytics,
  getInstructorDepartmentIds,
  getInstructorStudentRows,
} from "@/lib/instructor/queries";

export const metadata = {
  title: "Analytics",
};

export default async function InstructorAnalyticsPage() {
  const { supabase, user, profile } = await requireRole(["Instructor"]);
  const departmentIds = await getInstructorDepartmentIds(
    supabase,
    user.id,
    profile.department_id
  );
  const [rows, weeklyTrends, departmentName] = await Promise.all([
    getInstructorStudentRows(supabase, departmentIds),
    getDepartmentWeeklySeries(supabase, departmentIds),
    getDepartmentName(supabase, departmentIds),
  ]);
  const data = getInstructorAnalytics(rows, weeklyTrends);

  return (
    <InstructorAnalyticsView data={data} departmentName={departmentName} />
  );
}
