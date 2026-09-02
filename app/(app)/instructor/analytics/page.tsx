import { InstructorAnalyticsView } from "@/components/instructor/instructor-analytics";
import { requireRole } from "@/lib/auth/session";
import { getAiModelStatus } from "@/lib/guidance/model-metrics";
import {
  getDepartmentName,
  getDepartmentWeeklySeries,
  getInstructorAnalytics,
  getInstructorStudentRows,
} from "@/lib/instructor/queries";

export const metadata = {
  title: "Analytics",
};

export default async function InstructorAnalyticsPage() {
  const { supabase, profile } = await requireRole(["Instructor"]);
  const [rows, weeklyTrends, departmentName, aiStatus] = await Promise.all([
    getInstructorStudentRows(supabase, profile.department_id),
    getDepartmentWeeklySeries(supabase, profile.department_id),
    getDepartmentName(supabase, profile.department_id),
    getAiModelStatus(),
  ]);
  const data = getInstructorAnalytics(rows, weeklyTrends);

  return (
    <InstructorAnalyticsView
      data={data}
      departmentName={departmentName}
      modelEvaluation={aiStatus.modelEvaluation}
      aiHealthy={aiStatus.aiHealthy}
      metricsSource={aiStatus.metricsSource}
    />
  );
}
