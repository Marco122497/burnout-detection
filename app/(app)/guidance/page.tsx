import { GuidanceDashboard } from "@/components/guidance/guidance-dashboard";
import { requireRole } from "@/lib/auth/session";
import { getGuidanceDashboardStats } from "@/lib/guidance/queries";
import {
  getGuidanceAnalytics,
  getGuidanceStudentRows,
  getUniversityWeeklySeries,
} from "@/lib/guidance/monitoring";

export default async function GuidanceDashboardPage() {
  const { supabase, profile } = await requireRole(["Guidance Counselor"]);
  const [stats, studentRows, weeklySeries] = await Promise.all([
    getGuidanceDashboardStats(supabase),
    getGuidanceStudentRows(supabase),
    getUniversityWeeklySeries(supabase),
  ]);

  const analytics = getGuidanceAnalytics(studentRows, weeklySeries);

  return (
    <GuidanceDashboard
      firstName={profile.first_name}
      stats={stats}
      charts={{
        burnoutDistribution: analytics.burnoutDistribution,
        departmentComparison: analytics.departmentComparison,
        weeklyTrends: analytics.weeklyTrends,
      }}
    />
  );
}
