import { InstructorDashboard } from "@/components/instructor/instructor-dashboard";
import { requireRole } from "@/lib/auth/session";
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
  const data = await getInstructorDashboardData(
    supabase,
    user.id,
    departmentIds
  );

  return <InstructorDashboard data={data} />;
}
