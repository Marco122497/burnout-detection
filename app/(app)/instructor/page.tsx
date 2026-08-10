import { InstructorDashboard } from "@/components/instructor/instructor-dashboard";
import { requireRole } from "@/lib/auth/session";
import { getModelEvaluation } from "@/lib/guidance/model-metrics";
import { getInstructorDashboardData } from "@/lib/instructor/queries";
import { checkBurnoutAiHealth } from "@/lib/student/ai-client";

export const metadata = {
  title: "Instructor Dashboard",
};

export default async function InstructorDashboardPage() {
  const { supabase, user, profile } = await requireRole(["Instructor"]);
  const [data, modelEvaluation, aiHealthy] = await Promise.all([
    getInstructorDashboardData(supabase, user.id, profile.department_id),
    getModelEvaluation(),
    checkBurnoutAiHealth(),
  ]);

  return (
    <InstructorDashboard
      data={data}
      modelEvaluation={modelEvaluation}
      aiHealthy={aiHealthy}
    />
  );
}
