import { ChartPieIcon } from "lucide-react";

import { GuidanceAnalyticsView } from "@/components/guidance/guidance-analytics";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { buildFormalName } from "@/lib/auth/roles";
import { getModelEvaluation } from "@/lib/guidance/model-metrics";
import {
  getGuidanceAnalytics,
  getGuidanceStudentRows,
  getUniversityWeeklySeries,
} from "@/lib/guidance/monitoring";
import { checkBurnoutAiHealth } from "@/lib/student/ai-client";

export const metadata = {
  title: "Analytics",
};

export default async function GuidanceAnalyticsPage() {
  const { supabase, profile } = await requireRole(["Guidance Counselor"]);
  const [rows, weeklyTrends, modelEvaluation, aiHealthy] = await Promise.all([
    getGuidanceStudentRows(supabase),
    getUniversityWeeklySeries(supabase),
    getModelEvaluation(),
    checkBurnoutAiHealth(),
  ]);
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
        modelEvaluation={modelEvaluation}
        aiHealthy={aiHealthy}
        preparedBy={buildFormalName(profile) || profile.role}
        preparedRole={profile.role}
      />
    </div>
  );
}
