import { ChartPieIcon } from "lucide-react";

import { GuidanceAnalyticsView } from "@/components/guidance/guidance-analytics";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import {
  getGuidanceAnalytics,
  getGuidanceStudentRows,
  getUniversityWeeklySeries,
} from "@/lib/guidance/monitoring";

export default async function GuidanceAnalyticsPage() {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const [rows, weeklyTrends] = await Promise.all([
    getGuidanceStudentRows(supabase),
    getUniversityWeeklySeries(supabase),
  ]);
  const data = getGuidanceAnalytics(rows, weeklyTrends);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Burnout Analytics Dashboard"
        description="College-wide burnout overview, trends, program comparison, and students needing immediate attention."
        icon={ChartPieIcon}
      />
      <GuidanceAnalyticsView data={data} />
    </div>
  );
}
