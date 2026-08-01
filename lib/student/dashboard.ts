import type { Profile } from "@/lib/auth/roles";
import type { createClient } from "@/lib/supabase/server";
import {
  ensureWeeklyMonitoringReminder,
  getWeeklyMonitoringHistory,
} from "@/lib/student/queries";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type BurnoutFactor = {
  raw: number;
  normalized: number;
};

export type StudentDashboardData = {
  burnoutLevel: string | null;
  mfbiScore: number | null;
  stressLevel: string | null;
  stressScore: number | null;
  latestWeek: number | null;
  factors: {
    stress: BurnoutFactor;
    workload: BurnoutFactor;
    studyTime: BurnoutFactor;
    sleep: BurnoutFactor;
  } | null;
  monitoringStatus: "Submitted" | "Pending" | "Closed";
  latestMonitoringDate: string | null;
  currentWeek: number | null;
  weeklyTrend: { week: number; score: number | null; level: string | null }[];
  recommendation: {
    title: string;
    description: string;
    burnout_level: string;
    recommended_action: string | null;
  } | null;
  announcements: {
    announcement_id: number;
    title: string;
    content: string;
    created_at: string;
  }[];
  courseLabel: string | null;
};

export async function getStudentDashboardData(
  supabase: SupabaseClient,
  profile: Profile
): Promise<StudentDashboardData> {
  const studentId = profile.id;

  const [term, history] = await Promise.all([
    getActiveTerm(supabase),
    getWeeklyMonitoringHistory(supabase, studentId),
  ]);

  const currentWeek = term ? getCurrentWeekNumber(term) : null;
  const submittedThisWeek = Boolean(
    currentWeek && history.some((row) => row.week_number === currentWeek)
  );

  const latest = history[0] ?? null;
  const mfbi = latest?.mfbi_results
    ? Array.isArray(latest.mfbi_results)
      ? latest.mfbi_results[0]
      : latest.mfbi_results
    : null;

  const burnoutLevel =
    latest?.prediction?.final_prediction ?? mfbi?.burnout_level ?? null;
  const mfbiScore = mfbi?.mfbi_score ?? null;

  const [recommendationRow, department, announcementResult] =
    await Promise.all([
      burnoutLevel
        ? supabase
            .from("recommendations")
            .select(
              "title, description, recommended_action, burnout_risk_level"
            )
            .eq("burnout_risk_level", burnoutLevel)
            .eq("is_active", true)
            .order("created_at", { ascending: true })
            .limit(1)
            .maybeSingle()
            .then((r) => r.data)
        : Promise.resolve(null),
      profile.department_id
        ? supabase
            .from("departments")
            .select("description, department_name")
            .eq("department_id", profile.department_id)
            .maybeSingle()
            .then((r) => r.data)
        : Promise.resolve(null),
      supabase
        .from("announcements")
        .select(
          "announcement_id, title, content, created_at, department_id, course, year_level, section, is_active"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20),
      ensureWeeklyMonitoringReminder(
        supabase,
        studentId,
        currentWeek,
        submittedThisWeek || !term?.monitoring_enabled
      ),
    ]);

  const recommendation: StudentDashboardData["recommendation"] =
    recommendationRow
      ? {
          title: recommendationRow.title,
          description: recommendationRow.description,
          burnout_level: recommendationRow.burnout_risk_level,
          recommended_action: recommendationRow.recommended_action,
        }
      : null;

  const courseLabel =
    department?.description ||
    department?.department_name ||
    profile.course ||
    null;

  const announcements = (announcementResult.data ?? [])
    .filter((item) => {
      if (
        item.department_id != null &&
        profile.department_id != null &&
        item.department_id !== profile.department_id
      ) {
        return false;
      }
      if (item.course && profile.course && item.course !== profile.course) {
        return false;
      }
      if (
        item.year_level != null &&
        profile.year_level != null &&
        item.year_level !== profile.year_level
      ) {
        return false;
      }
      if (item.section && profile.section && item.section !== profile.section) {
        return false;
      }
      return true;
    })
    .slice(0, 5)
    .map((item) => ({
      announcement_id: item.announcement_id,
      title: item.title,
      content: item.content,
      created_at: item.created_at,
    }));

  const weeklyTrend = [...history]
    .reverse()
    .slice(-8)
    .map((row) => {
      const result = Array.isArray(row.mfbi_results)
        ? row.mfbi_results[0]
        : row.mfbi_results;
      return {
        week: row.week_number,
        score: result?.mfbi_score ?? null,
        level:
          row.prediction?.final_prediction ?? result?.burnout_level ?? null,
      };
    });

  const stressScore = latest?.stress_score ?? null;
  const stressLevel =
    stressScore == null
      ? null
      : stressScore <= 13
        ? "Low"
        : stressScore <= 26
          ? "Moderate"
          : "High";

  const factors =
    latest && mfbi
      ? {
          stress: {
            raw: latest.stress_score,
            normalized: mfbi.normalized_stress,
          },
          workload: {
            raw: latest.academic_workload,
            normalized: mfbi.normalized_workload,
          },
          studyTime: {
            raw: latest.study_time,
            normalized: mfbi.normalized_study_time,
          },
          sleep: {
            raw: latest.sleep_hours,
            normalized: mfbi.normalized_sleep,
          },
        }
      : null;

  return {
    burnoutLevel,
    mfbiScore,
    stressLevel,
    stressScore,
    latestWeek: latest?.week_number ?? null,
    factors,
    monitoringStatus: submittedThisWeek
      ? "Submitted"
      : term?.monitoring_enabled
        ? "Pending"
        : "Closed",
    latestMonitoringDate: latest?.monitoring_date ?? null,
    currentWeek,
    weeklyTrend,
    recommendation,
    announcements,
    courseLabel,
  };
}
