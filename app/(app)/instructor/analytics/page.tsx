import { InstructorAnalyticsView } from "@/components/instructor/instructor-analytics";
import { requireRole } from "@/lib/auth/session";
import { getModelEvaluation } from "@/lib/guidance/model-metrics";
import {
  getDepartmentName,
  getDepartmentWeeklySeries,
  getInstructorAnalytics,
  getInstructorStudentRows,
} from "@/lib/instructor/queries";
import { checkBurnoutAiHealth } from "@/lib/student/ai-client";

export default async function InstructorAnalyticsPage() {
  const { supabase, profile } = await requireRole(["Instructor"]);
  const [rows, weeklyTrends, departmentName, modelEvaluation, aiHealthy] =
    await Promise.all([
      getInstructorStudentRows(supabase, profile.department_id),
      getDepartmentWeeklySeries(supabase, profile.department_id),
      getDepartmentName(supabase, profile.department_id),
      getModelEvaluation(),
      checkBurnoutAiHealth(),
    ]);
  const data = getInstructorAnalytics(rows, weeklyTrends);

  return (
    <InstructorAnalyticsView
      data={data}
      departmentName={departmentName}
      modelEvaluation={modelEvaluation}
      aiHealthy={aiHealthy}
    />
  );
}
