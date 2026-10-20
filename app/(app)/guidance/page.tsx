import { GuidanceDashboard } from "@/components/guidance/guidance-dashboard";
import { canViewAiModelStatus } from "@/lib/auth/protected-accounts";
import { requireRole } from "@/lib/auth/session";
import { getAiModelStatus } from "@/lib/guidance/model-metrics";
import {
  getGuidanceAnalytics,
  getGuidanceStudentRows,
  getMonitoringRecordWeeks,
  getUniversityWeeklySeries,
  getValidScoredSummary,
  getWeekVariableAverages,
} from "@/lib/guidance/monitoring";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";

export const metadata = {
  title: "Guidance Dashboard",
};

export default async function GuidanceDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const params = await searchParams;
  const { supabase, profile, user } = await requireRole([
    "Guidance Counselor",
  ]);
  const [term, recordWeeks] = await Promise.all([
    getActiveTerm(supabase),
    getMonitoringRecordWeeks(supabase),
  ]);
  const openWeek = term ? getCurrentWeekNumber(term) : 1;
  const highestRecord = Math.max(0, ...recordWeeks.latest.values());
  const weekCount = Math.max(openWeek, highestRecord, 1);
  const weeks = Array.from({ length: weekCount }, (_, index) => index + 1);
  const requested = Number(params.week);
  const selectedWeek =
    Number.isInteger(requested) && requested >= 1 && requested <= weekCount
      ? requested
      : openWeek;

  const [studentRows, weeklySeries, aiStatus, validScored, weekVariables] =
    await Promise.all([
      getGuidanceStudentRows(supabase, selectedWeek),
      getUniversityWeeklySeries(supabase),
      getAiModelStatus(),
      getValidScoredSummary(supabase),
      getWeekVariableAverages(supabase),
    ]);

  const data = getGuidanceAnalytics(studentRows, weeklySeries);

  return (
    <GuidanceDashboard
      firstName={profile.first_name}
      data={data}
      modelEvaluation={aiStatus.modelEvaluation}
      aiHealthy={aiStatus.aiHealthy}
      metricsSource={aiStatus.metricsSource}
      showAiModelStatus={canViewAiModelStatus(user.email)}
      weeks={weeks}
      selectedWeek={selectedWeek}
      validScored={validScored}
      weekVariables={weekVariables}
      nextWeekEvaluation={aiStatus.nextWeekEvaluation}
    />
  );
}
