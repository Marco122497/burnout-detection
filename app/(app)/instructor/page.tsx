import { InstructorDashboard } from "@/components/instructor/instructor-dashboard";
import { requireRole } from "@/lib/auth/session";
import { getAiModelStatus } from "@/lib/guidance/model-metrics";
import { getInstructorDashboardData } from "@/lib/instructor/queries";

export const metadata = {
  title: "Instructor Dashboard",
};

export default async function InstructorDashboardPage() {
  const { supabase, user, profile } = await requireRole(["Instructor"]);
  const [data, aiStatus] = await Promise.all([
    getInstructorDashboardData(supabase, user.id, profile.department_id),
    getAiModelStatus(),
  ]);

  return (
    <InstructorDashboard
      data={data}
      modelEvaluation={aiStatus.modelEvaluation}
      aiHealthy={aiStatus.aiHealthy}
      metricsSource={aiStatus.metricsSource}
    />
  );
}
