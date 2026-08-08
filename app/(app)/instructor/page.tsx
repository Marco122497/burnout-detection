import { InstructorDashboard } from "@/components/instructor/instructor-dashboard";
import { requireRole } from "@/lib/auth/session";
import { getInstructorDashboardData } from "@/lib/instructor/queries";

export default async function InstructorDashboardPage() {
  const { supabase, user, profile } = await requireRole(["Instructor"]);
  const data = await getInstructorDashboardData(
    supabase,
    user.id,
    profile.department_id
  );

  return <InstructorDashboard data={data} />;
}
