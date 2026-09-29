import { StudentDashboard } from "@/components/student/student-dashboard";
import { requireRole } from "@/lib/auth/session";
import { getStudentDashboardData } from "@/lib/student/dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Student Dashboard",
};

export default async function StudentDashboardPage() {
  const { supabase, profile } = await requireRole(["Student"]);
  // Wake Render-hosted burnout-ai (free tier sleeps). Do not block the dashboard.
  void import("@/lib/student/ai-client").then(({ warmBurnoutAi }) =>
    warmBurnoutAi()
  );
  const data = await getStudentDashboardData(supabase, profile);

  return <StudentDashboard profile={profile} data={data} />;
}
