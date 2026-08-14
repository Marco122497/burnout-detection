import type { Profile } from "@/lib/auth/roles";
import type { createClient } from "@/lib/supabase/server";
import {
  parseEarlyWarningRemarks,
  type EarlyWarningPayload,
} from "@/lib/student/ai-client";
import { getStudentBurnoutTrends, backfillBurnoutTrendsFromHistory } from "@/lib/student/burnout-trends";
import {
  ensureWeeklyMonitoringReminder,
  getWeeklyMonitoringHistory,
} from "@/lib/student/queries";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";
import type { BurnoutLevel } from "@/lib/student/mfbi";
import {
  getFactorRecommendations,
  getOverallRecommendation,
  type FactorRecommendation,
} from "@/lib/student/tips";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type BurnoutFactor = {
  raw: number;
  normalized: number;
};

export type StudentDashboardData = {
  burnoutLevel: string | null;
  mfbiScore: number | null;
  /** Selected-model prediction confidence as a percent (0–100). */
  modelConfidence: number | null;
  decisionTreeConfidence: number | null;
  randomForestConfidence: number | null;
  decisionTreePrediction: string | null;
  randomForestPrediction: string | null;
  predictionDate: string | null;
  selectedModel: string | null;
  stressLevel: string | null;
  stressScore: number | null;
  latestWeek: number | null;
  factors: {
    stress: BurnoutFactor;
    workload: BurnoutFactor;
    studyTime: BurnoutFactor;
    sleep: BurnoutFactor;
  } | null;
  earlyWarning: EarlyWarningPayload | null;
  monitoringStatus: "Submitted" | "Pending" | "Closed";
  latestMonitoringDate: string | null;
  currentWeek: number | null;
  weeklyTrend: {
    week: number;
    score: number | null;
    level: string | null;
    delta?: number | null;
    direction?: string | null;
  }[];
  recommendation: {
    title: string;
    description: string;
    burnout_level: string;
    recommended_action: string | null;
  } | null;
  factorRecommendations: FactorRecommendation[];
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

  let savedTrends = await getStudentBurnoutTrends(
    supabase,
    studentId,
    term?.term_id ?? null
  );

  // If the trends table exists but is empty, seed it from existing MFBI history.
  if (!savedTrends.length && term?.term_id && history.length) {
    const seeded = await backfillBurnoutTrendsFromHistory(
      supabase,
      studentId,
      term.term_id
    );
    if (seeded > 0) {
      savedTrends = await getStudentBurnoutTrends(
        supabase,
        studentId,
        term.term_id
      );
    }
  }
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
  const earlyWarning = parseEarlyWarningRemarks(
    latest?.prediction?.remarks ?? null
  );
  const selectedModel = latest?.prediction?.selected_model ?? null;
  const decisionTreeConfidence =
    latest?.prediction?.decision_tree_confidence != null
      ? Math.round(Number(latest.prediction.decision_tree_confidence))
      : null;
  const randomForestConfidence =
    latest?.prediction?.random_forest_confidence != null
      ? Math.round(Number(latest.prediction.random_forest_confidence))
      : null;
  const decisionTreePrediction =
    latest?.prediction?.decision_tree_prediction ?? null;
  const randomForestPrediction =
    latest?.prediction?.random_forest_prediction ?? null;
  const modelConfidence =
    selectedModel === "Decision Tree"
      ? decisionTreeConfidence
      : selectedModel === "Random Forest"
        ? randomForestConfidence
        : (randomForestConfidence ?? decisionTreeConfidence);
  const predictionDate =
    latest?.prediction?.prediction_date ?? latest?.monitoring_date ?? null;

  const [department, announcementResult] =
    await Promise.all([
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

  const overall = getOverallRecommendation(
    (burnoutLevel as BurnoutLevel | null) ?? null
  );
  const recommendation: StudentDashboardData["recommendation"] = overall
    ? {
        title: overall.title,
        description: overall.description,
        burnout_level: overall.burnout_level,
        recommended_action: overall.recommended_action,
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

  const weeklyTrendFromHistory = [...history]
    .reverse()
    .map((row) => {
      const result = Array.isArray(row.mfbi_results)
        ? row.mfbi_results[0]
        : row.mfbi_results;
      if (result?.mfbi_score == null) return null;
      return {
        week: row.week_number,
        score: result.mfbi_score,
        level:
          row.prediction?.final_prediction ?? result.burnout_level ?? null,
        delta: null as number | null,
        direction: null as string | null,
      };
    })
    .filter((point): point is NonNullable<typeof point> => point != null)
    .slice(-12);

  const weeklyTrend =
    savedTrends.length > 0
      ? savedTrends.slice(-12).map((point) => ({
          week: point.week,
          score: point.score,
          level: point.level,
          delta: point.delta,
          direction: point.direction,
        }))
      : weeklyTrendFromHistory;

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

  const factorRecommendations = getFactorRecommendations(factors);

  return {
    burnoutLevel,
    mfbiScore,
    modelConfidence,
    decisionTreeConfidence,
    randomForestConfidence,
    decisionTreePrediction,
    randomForestPrediction,
    predictionDate,
    selectedModel,
    stressLevel,
    stressScore,
    latestWeek: latest?.week_number ?? null,
    factors,
    earlyWarning,
    monitoringStatus: submittedThisWeek
      ? "Submitted"
      : term?.monitoring_enabled
        ? "Pending"
        : "Closed",
    latestMonitoringDate: latest?.monitoring_date ?? null,
    currentWeek,
    weeklyTrend,
    recommendation,
    factorRecommendations,
    announcements,
    courseLabel,
  };
}
