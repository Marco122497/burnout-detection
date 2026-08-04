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
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Burnout Analytics Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          College,-wide burnout overview, trends, program comparison, and
          students needing immediate attention.
        </p>
      </div>
      <GuidanceAnalyticsView data={data} />
    </div>
  );
}
