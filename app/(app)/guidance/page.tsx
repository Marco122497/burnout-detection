import { GuidanceDashboard } from "@/components/guidance/guidance-dashboard";
import { requireRole } from "@/lib/auth/session";
import { getModelEvaluation } from "@/lib/guidance/model-metrics";
import {
  getGuidanceAnalytics,
  getGuidanceStudentRows,
  getUniversityWeeklySeries,
} from "@/lib/guidance/monitoring";
import { checkBurnoutAiHealth } from "@/lib/student/ai-client";

export const metadata = {
  title: "Guidance Dashboard",
};

export default async function GuidanceDashboardPage() {
  const { supabase, profile } = await requireRole(["Guidance Counselor"]);
  const [studentRows, weeklySeries, modelEvaluation, aiHealthy] =
    await Promise.all([
      getGuidanceStudentRows(supabase),
      getUniversityWeeklySeries(supabase),
      getModelEvaluation(),
      checkBurnoutAiHealth(),
    ]);

  const data = getGuidanceAnalytics(studentRows, weeklySeries);

  return (
    <GuidanceDashboard
      firstName={profile.first_name}
      data={data}
      modelEvaluation={modelEvaluation}
      aiHealthy={aiHealthy}
    />
  );
}
