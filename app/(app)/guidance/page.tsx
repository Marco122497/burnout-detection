import { GuidanceDashboard } from "@/components/guidance/guidance-dashboard";
import { requireRole } from "@/lib/auth/session";
import { getAiModelStatus } from "@/lib/guidance/model-metrics";
import {
  getGuidanceAnalytics,
  getGuidanceStudentRows,
  getUniversityWeeklySeries,
} from "@/lib/guidance/monitoring";

export const metadata = {
  title: "Guidance Dashboard",
};

export default async function GuidanceDashboardPage() {
  const { supabase, profile } = await requireRole(["Guidance Counselor"]);
  const [studentRows, weeklySeries, aiStatus] = await Promise.all([
    getGuidanceStudentRows(supabase),
    getUniversityWeeklySeries(supabase),
    getAiModelStatus(),
  ]);

  const data = getGuidanceAnalytics(studentRows, weeklySeries);

  return (
    <GuidanceDashboard
      firstName={profile.first_name}
      data={data}
      modelEvaluation={aiStatus.modelEvaluation}
      aiHealthy={aiStatus.aiHealthy}
      metricsSource={aiStatus.metricsSource}
    />
  );
}
