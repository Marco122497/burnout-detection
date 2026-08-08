import { GuidanceDashboard } from "@/components/guidance/guidance-dashboard";
import { requireRole } from "@/lib/auth/session";
import {
  getGuidanceAnalytics,
  getGuidanceStudentRows,
  getUniversityWeeklySeries,
} from "@/lib/guidance/monitoring";

export default async function GuidanceDashboardPage() {
  const { supabase, profile } = await requireRole(["Guidance Counselor"]);
  const [studentRows, weeklySeries] = await Promise.all([
    getGuidanceStudentRows(supabase),
    getUniversityWeeklySeries(supabase),
  ]);

  const data = getGuidanceAnalytics(studentRows, weeklySeries);

  return <GuidanceDashboard firstName={profile.first_name} data={data} />;
}
