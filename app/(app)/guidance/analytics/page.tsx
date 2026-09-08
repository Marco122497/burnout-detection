import { ChartPieIcon } from "lucide-react";

import { GuidanceAnalyticsView } from "@/components/guidance/guidance-analytics";
import { PageHeading } from "@/components/layout/page-heading";
import { getSchoolAdministratorSignatory } from "@/lib/app-settings";
import { requireRole } from "@/lib/auth/session";
import { getAiModelStatus } from "@/lib/guidance/model-metrics";
import {
  getGuidanceAnalytics,
  getGuidanceStudentRows,
  getUniversityWeeklySeries,
} from "@/lib/guidance/monitoring";

export const metadata = {
  title: "Analytics",
};

export default async function GuidanceAnalyticsPage() {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const [rows, weeklyTrends, aiStatus, schoolAdministrator] = await Promise.all(
    [
      getGuidanceStudentRows(supabase),
      getUniversityWeeklySeries(supabase),
      getAiModelStatus(),
      getSchoolAdministratorSignatory(supabase),
    ]
  );
  const data = getGuidanceAnalytics(rows, weeklyTrends);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Burnout Analytics Dashboard"
        description="College-wide burnout overview, AI early warnings, trends, and students needing attention."
        icon={ChartPieIcon}
      />
      <GuidanceAnalyticsView
        data={data}
        modelEvaluation={aiStatus.modelEvaluation}
        aiHealthy={aiStatus.aiHealthy}
        metricsSource={aiStatus.metricsSource}
        schoolAdministratorName={schoolAdministrator.name}
        schoolAdministratorTitle={schoolAdministrator.title}
      />
    </div>
  );
}
