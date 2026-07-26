import { GuidanceAnalyticsView } from "@/components/guidance/guidance-analytics";
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
      <div>
        <p className="text-sm font-medium text-primary">Analytics</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          University burnout analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overall risk distribution, department comparison, and weekly trends.
        </p>
      </div>
      <GuidanceAnalyticsView data={data} />
    </div>
  );
}
