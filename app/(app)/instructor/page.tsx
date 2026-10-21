import { InstructorDashboard } from "@/components/instructor/instructor-dashboard";
import { requireRole } from "@/lib/auth/session";
import { getDepartmentScoreCharts } from "@/lib/guidance/monitoring";
import {
  getInstructorDashboardData,
  getInstructorDepartmentIds,
} from "@/lib/instructor/queries";

export const metadata = {
  title: "Instructor Dashboard",
};

export default async function InstructorDashboardPage() {
  const { supabase, user, profile } = await requireRole(["Instructor"]);
  const departmentIds = await getInstructorDepartmentIds(
    supabase,
    user.id,
    profile.department_id
  );
  const [data, charts] = await Promise.all([
    getInstructorDashboardData(supabase, user.id, departmentIds),
    getDepartmentScoreCharts(supabase, departmentIds),
  ]);

  return <InstructorDashboard data={data} charts={charts} />;
}
