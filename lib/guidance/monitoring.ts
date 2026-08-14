import type { createClient } from "@/lib/supabase/server";
import { buildFullName } from "@/lib/auth/roles";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";
import type {
  StudentHistoryRow,
  StudentMonitorRow,
} from "@/lib/instructor/queries";
import { formatYearLevel } from "@/lib/utils";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type GuidanceStudentRow = StudentMonitorRow & {
  department_id: number | null;
  department_name: string | null;
  department_code: string | null;
};

export type GuidanceSearchFilters = {
  q?: string;
  department_id?: string;
  course?: string;
  year_level?: string;
  section?: string;
  risk?: string;
};

function stressLevelFromScore(score: number | null | undefined) {
  if (score == null || Number.isNaN(Number(score))) return null;
  const value = Number(score);
  if (value <= 13) return "Low";
  if (value <= 26) return "Moderate";
  return "High";
}

function countBy(values: string[]) {
  const map = new Map<string, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count }));
}

export async function getGuidanceStudentRows(
  supabase: SupabaseClient
): Promise<GuidanceStudentRow[]> {
  const term = await getActiveTerm(supabase);
  const currentWeek = term ? getCurrentWeekNumber(term) : null;

  const { data: students } = await supabase
    .from("profiles")
    .select(
      "id, first_name, middle_name, last_name, suffix, student_number, course, year_level, section, is_active, department_id, departments(department_code, department_name, description)"
    )
    .eq("role", "Student")
    .eq("is_active", true)
    .order("last_name", { ascending: true });

  if (!students?.length) return [];

  const ids = students.map((s) => s.id);

  // Keep select flat (no nested ml_predictions) so primary/fallback types stay compatible.
  let monitoringQuery = supabase
    .from("weekly_monitoring")
    .select(
      "monitoring_id, student_id, week_number, stress_score, academic_workload_score, study_time_score, sleep_hours_score, submitted_at, term_id, created_at, mfbi_results(mfbi_id, mfbi_score, burnout_risk_level)"
    )
    .in("student_id", ids)
    .order("created_at", { ascending: false });

  if (term?.term_id) {
    monitoringQuery = monitoringQuery.eq("term_id", term.term_id);
  }

  const { data: monitoringRows, error: monitoringError } = await monitoringQuery;
  const monitoringList = monitoringError ? [] : (monitoringRows ?? []);
  const latestMonitoring = new Map<string, (typeof monitoringList)[number]>();
  const submittedThisWeek = new Set<string>();
  const mfbiIds: number[] = [];

  for (const row of monitoringList) {
    if (!latestMonitoring.has(row.student_id)) {
      latestMonitoring.set(row.student_id, row);
      const mfbiRaw = row.mfbi_results;
      const mfbi = Array.isArray(mfbiRaw) ? mfbiRaw[0] : mfbiRaw;
      if (mfbi?.mfbi_id) {
        mfbiIds.push(mfbi.mfbi_id);
      }
    }
    if (
      term &&
      currentWeek &&
      row.term_id === term.term_id &&
      row.week_number === currentWeek
    ) {
      submittedThisWeek.add(row.student_id);
    }
  }

  const predictionByMfbi = new Map<
    number,
    {
      final_prediction: string;
      early_warning_attention: boolean;
      next_week_risk: string | null;
      week2_risk: string | null;
      early_warning_trend: string | null;
      has_ml_next_week: boolean;
    }
  >();
  if (mfbiIds.length) {
    const { data: predictions } = await supabase
      .from("ml_predictions")
      .select("mfbi_id, final_prediction, remarks")
      .in("mfbi_id", mfbiIds);
    const { staffEarlyWarningFromRemarks } = await import(
      "@/lib/student/early-warning-staff"
    );
    for (const prediction of predictions ?? []) {
      const ew = staffEarlyWarningFromRemarks(prediction.remarks);
      predictionByMfbi.set(prediction.mfbi_id, {
        final_prediction: prediction.final_prediction,
        ...ew,
      });
    }
  }

  return students.map((student) => {
    const monitoring = latestMonitoring.get(student.id) ?? null;
    const mfbiRaw = monitoring?.mfbi_results;
    const mfbi = Array.isArray(mfbiRaw) ? mfbiRaw[0] : mfbiRaw;
    const stressScore =
      monitoring?.stress_score != null ? Number(monitoring.stress_score) : null;

    const deptRaw = student.departments as
      | {
          department_code: string;
          department_name: string;
          description: string | null;
        }
      | {
          department_code: string;
          department_name: string;
          description: string | null;
        }[]
      | null;
    const dept = Array.isArray(deptRaw) ? deptRaw[0] : deptRaw;
    const pred = mfbi?.mfbi_id
      ? predictionByMfbi.get(mfbi.mfbi_id) ?? null
      : null;

    return {
      id: student.id,
      full_name: buildFullName(student),
      student_number: student.student_number,
      course: student.course,
      year_level: student.year_level,
      section: student.section,
      stress_score: stressScore,
      stress_level: stressLevelFromScore(stressScore),
      week_number: monitoring?.week_number ?? null,
      academic_workload:
        monitoring?.academic_workload_score != null
          ? Number(monitoring.academic_workload_score)
          : null,
      study_time:
        monitoring?.study_time_score != null
          ? Number(monitoring.study_time_score)
          : null,
      sleep_hours:
        monitoring?.sleep_hours_score != null
          ? Number(monitoring.sleep_hours_score)
          : null,
      mfbi_score: mfbi?.mfbi_score != null ? Number(mfbi.mfbi_score) : null,
      burnout_level: mfbi?.burnout_risk_level ?? null,
      prediction: pred?.final_prediction ?? null,
      early_warning_attention: pred?.early_warning_attention ?? false,
      next_week_risk: pred?.next_week_risk ?? null,
      week2_risk: pred?.week2_risk ?? null,
      early_warning_trend: pred?.early_warning_trend ?? null,
      has_ml_next_week: pred?.has_ml_next_week ?? false,
      previous_mfbi_score: null,
      previous_burnout_level: null,
      monitoring_date: monitoring?.submitted_at ?? null,
      submittedThisWeek: submittedThisWeek.has(student.id),
      department_id: student.department_id,
      department_code: dept?.department_code ?? null,
      department_name:
        dept?.department_name || dept?.description || null,
    };
  });
}

export async function getGuidanceStudentHistory(
  supabase: SupabaseClient,
  studentId: string
): Promise<{
  student: GuidanceStudentRow | null;
  history: StudentHistoryRow[];
}> {
  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, first_name, middle_name, last_name, suffix, student_number, course, year_level, section, department_id, role, is_active, departments(department_code, department_name, description)"
    )
    .eq("id", studentId)
    .eq("role", "Student")
    .maybeSingle();

  if (!profile) return { student: null, history: [] };

  const { data: monitoringRows } = await supabase
    .from("weekly_monitoring")
    .select(
      "monitoring_id, week_number, stress_score, academic_workload_score, study_time_score, sleep_hours_score, submitted_at, mfbi_results(mfbi_id, mfbi_score, burnout_risk_level, normalized_stress, normalized_academic_workload, normalized_study_time, normalized_sleep_hours)"
    )
    .eq("student_id", studentId)
    .order("week_number", { ascending: false });

  const rows = monitoringRows ?? [];
  const mfbiIds = rows
    .map((row) => {
      const mfbi = Array.isArray(row.mfbi_results)
        ? row.mfbi_results[0]
        : row.mfbi_results;
      return mfbi?.mfbi_id as number | undefined;
    })
    .filter((id): id is number => Boolean(id));

  const predictionByMfbi = new Map<
    number,
    { final_prediction: string; remarks: string | null }
  >();
  if (mfbiIds.length) {
    const { data: predictions } = await supabase
      .from("ml_predictions")
      .select("mfbi_id, final_prediction, remarks")
      .in("mfbi_id", mfbiIds);
    for (const prediction of predictions ?? []) {
      predictionByMfbi.set(prediction.mfbi_id, {
        final_prediction: prediction.final_prediction,
        remarks: prediction.remarks ?? null,
      });
    }
  }

  const history: StudentHistoryRow[] = rows.map((row) => {
    const mfbi = Array.isArray(row.mfbi_results)
      ? row.mfbi_results[0]
      : row.mfbi_results;
    const prediction = mfbi?.mfbi_id
      ? predictionByMfbi.get(mfbi.mfbi_id) ?? null
      : null;
    return {
      monitoring_id: row.monitoring_id,
      week_number: row.week_number,
      stress_score: Number(row.stress_score),
      academic_workload: Number(row.academic_workload_score),
      study_time: Number(row.study_time_score),
      sleep_hours: Number(row.sleep_hours_score),
      submitted_at: row.submitted_at,
      mfbi_score: mfbi?.mfbi_score != null ? Number(mfbi.mfbi_score) : null,
      burnout_level: mfbi?.burnout_risk_level ?? null,
      prediction: prediction?.final_prediction ?? null,
      prediction_remarks: prediction?.remarks ?? null,
      normalized_stress:
        mfbi?.normalized_stress != null ? Number(mfbi.normalized_stress) : null,
      normalized_workload:
        mfbi?.normalized_academic_workload != null
          ? Number(mfbi.normalized_academic_workload)
          : null,
      normalized_study_time:
        mfbi?.normalized_study_time != null
          ? Number(mfbi.normalized_study_time)
          : null,
      normalized_sleep:
        mfbi?.normalized_sleep_hours != null
          ? Number(mfbi.normalized_sleep_hours)
          : null,
    };
  });

  const latest = history[0] ?? null;
  const previous = history[1] ?? null;
  const deptRaw = profile.departments as
    | {
        department_code: string;
        department_name: string;
        description: string | null;
      }
    | {
        department_code: string;
        department_name: string;
        description: string | null;
      }[]
    | null;
  const dept = Array.isArray(deptRaw) ? deptRaw[0] : deptRaw;

  return {
    student: {
      id: profile.id,
      full_name: buildFullName(profile),
      student_number: profile.student_number,
      course: profile.course,
      year_level: profile.year_level,
      section: profile.section,
      stress_score: latest?.stress_score ?? null,
      stress_level: stressLevelFromScore(latest?.stress_score ?? null),
      week_number: latest?.week_number ?? null,
      academic_workload: latest?.academic_workload ?? null,
      study_time: latest?.study_time ?? null,
      sleep_hours: latest?.sleep_hours ?? null,
      mfbi_score: latest?.mfbi_score ?? null,
      burnout_level: latest?.burnout_level ?? null,
      prediction: latest?.prediction ?? null,
      previous_mfbi_score: previous?.mfbi_score ?? null,
      previous_burnout_level: previous?.burnout_level ?? null,
      monitoring_date: latest?.submitted_at ?? null,
      submittedThisWeek: false,
      department_id: profile.department_id,
      department_code: dept?.department_code ?? null,
      department_name:
        dept?.department_name || dept?.description || null,
    },
    history,
  };
}

export async function getUniversityWeeklySeries(supabase: SupabaseClient) {
  const term = await getActiveTerm(supabase);
  let query = supabase
    .from("weekly_monitoring")
    .select("week_number, mfbi_results(mfbi_score, burnout_risk_level)");

  if (term?.term_id) {
    query = query.eq("term_id", term.term_id);
  }

  const { data } = await query;

  const weeklyMap = new Map<
    number,
    { scores: number[]; low: number; moderate: number; high: number }
  >();

  for (const row of data ?? []) {
    const mfbi = Array.isArray(row.mfbi_results)
      ? row.mfbi_results[0]
      : row.mfbi_results;
    if (row.week_number == null) continue;

    const entry = weeklyMap.get(row.week_number) ?? {
      scores: [],
      low: 0,
      moderate: 0,
      high: 0,
    };

    if (mfbi?.mfbi_score != null) {
      entry.scores.push(Number(mfbi.mfbi_score));
    }

    const bucket = riskBucket(mfbi?.burnout_risk_level ?? null);
    if (bucket === "Low") entry.low += 1;
    else if (bucket === "Moderate") entry.moderate += 1;
    else if (bucket === "High") entry.high += 1;

    weeklyMap.set(row.week_number, entry);
  }

  return [...weeklyMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, entry]) => ({
      week,
      average: entry.scores.length
        ? entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
        : 0,
      count: entry.scores.length,
      lowCount: entry.low,
      moderateCount: entry.moderate,
      highCount: entry.high,
    }));
}

function riskBucket(level: string | null | undefined): "Low" | "Moderate" | "High" | null {
  if (!level) return null;
  if (level === "Low") return "Low";
  if (level === "Moderate") return "Moderate";
  if (level === "High" || level === "Severe") return "High";
  return null;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function getGuidanceAnalytics(
  rows: GuidanceStudentRow[],
  weeklyTrends: {
    week: number;
    average: number;
    count: number;
    lowCount?: number;
    moderateCount?: number;
    highCount?: number;
  }[] = []
) {
  const avg = (values: number[]) =>
    values.length
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null;

  const mfbiValues = rows
    .map((r) => r.mfbi_score)
    .filter((n): n is number => n != null);
  const stressValues = rows
    .map((r) => r.stress_score)
    .filter((n): n is number => n != null);
  const workloadValues = rows
    .map((r) => r.academic_workload)
    .filter((n): n is number => n != null);
  const studyValues = rows
    .map((r) => r.study_time)
    .filter((n): n is number => n != null);
  const sleepValues = rows
    .map((r) => r.sleep_hours)
    .filter((n): n is number => n != null);

  const burnoutDistribution = countBy(
    rows
      .map((r) => r.prediction || r.burnout_level)
      .filter(Boolean) as string[]
  );

  const classified = rows
    .map((r) => ({
      row: r,
      bucket: riskBucket(r.prediction || r.burnout_level),
    }))
    .filter(
      (item): item is { row: GuidanceStudentRow; bucket: "Low" | "Moderate" | "High" } =>
        item.bucket != null
    );

  const classifiedTotal = classified.length || 1;
  const riskOverview = (
    ["Low", "Moderate", "High"] as const
  ).map((label) => {
    const count = classified.filter((item) => item.bucket === label).length;
    return {
      label,
      count,
      percent: Math.round((count / classifiedTotal) * 1000) / 10,
    };
  });

  const deptMap = new Map<string, number[]>();
  for (const row of rows) {
    if (row.mfbi_score == null) continue;
    const label = row.department_name || "Unassigned";
    const list = deptMap.get(label) ?? [];
    list.push(row.mfbi_score);
    deptMap.set(label, list);
  }

  const departmentComparison = [...deptMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, scores]) => ({
      label,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    }));

  const yearMap = new Map<
    number,
    { scores: number[]; highRisk: number; total: number }
  >();
  for (const row of rows) {
    if (row.year_level == null) continue;
    const entry = yearMap.get(row.year_level) ?? {
      scores: [],
      highRisk: 0,
      total: 0,
    };
    entry.total += 1;
    if (row.mfbi_score != null) entry.scores.push(row.mfbi_score);
    const bucket = riskBucket(row.prediction || row.burnout_level);
    if (bucket === "High") entry.highRisk += 1;
    yearMap.set(row.year_level, entry);
  }

  const byYearLevel = [...yearMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, entry]) => ({
      label: formatYearLevel(year),
      year,
      average: entry.scores.length ? avg(entry.scores)! : 0,
      highRiskCount: entry.highRisk,
      count: entry.total,
    }));

  const courseMap = new Map<
    string,
    { scores: number[]; low: number; moderate: number; high: number; total: number }
  >();
  for (const row of rows) {
    const label = (row.course || "").trim() || "Unassigned";
    const entry = courseMap.get(label) ?? {
      scores: [],
      low: 0,
      moderate: 0,
      high: 0,
      total: 0,
    };
    entry.total += 1;
    if (row.mfbi_score != null) entry.scores.push(row.mfbi_score);
    const bucket = riskBucket(row.prediction || row.burnout_level);
    if (bucket === "Low") entry.low += 1;
    else if (bucket === "Moderate") entry.moderate += 1;
    else if (bucket === "High") entry.high += 1;
    courseMap.set(label, entry);
  }

  const byCourse = [...courseMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, entry]) => ({
      label,
      average: entry.scores.length ? avg(entry.scores)! : 0,
      count: entry.total,
      low: entry.low,
      moderate: entry.moderate,
      high: entry.high,
    }));

  const averageStress = avg(stressValues);
  const averageWorkload = avg(workloadValues);
  const averageStudy = avg(studyValues);
  const averageSleep = avg(sleepValues);

  const normalized = {
    stress: averageStress != null ? Math.min(1, averageStress / 40) : null,
    sleep: averageSleep != null ? Math.min(1, averageSleep / 100) : null,
    studyTime: averageStudy != null ? Math.min(1, averageStudy / 12) : null,
    workload: averageWorkload != null ? Math.min(1, averageWorkload / 10) : null,
  };

  const contributionSum =
    (normalized.stress ?? 0) +
    (normalized.sleep ?? 0) +
    (normalized.studyTime ?? 0) +
    (normalized.workload ?? 0);

  const variableContribution = [
    {
      key: "stress",
      label: "Stress Level",
      scale: "0–40 (PSS)",
      normalized: normalized.stress,
      percent:
        contributionSum > 0 && normalized.stress != null
          ? Math.round((normalized.stress / contributionSum) * 1000) / 10
          : null,
    },
    {
      key: "sleep",
      label: "Sleep Risk",
      scale: "0–100",
      normalized: normalized.sleep,
      percent:
        contributionSum > 0 && normalized.sleep != null
          ? Math.round((normalized.sleep / contributionSum) * 1000) / 10
          : null,
    },
    {
      key: "workload",
      label: "Academic Workload",
      scale: "0–10",
      normalized: normalized.workload,
      percent:
        contributionSum > 0 && normalized.workload != null
          ? Math.round((normalized.workload / contributionSum) * 1000) / 10
          : null,
    },
    {
      key: "studyTime",
      label: "Study Time",
      scale: "hours / day",
      normalized: normalized.studyTime,
      percent:
        contributionSum > 0 && normalized.studyTime != null
          ? Math.round((normalized.studyTime / contributionSum) * 1000) / 10
          : null,
    },
  ].sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0));

  const averageScores = [
    {
      label: "Stress Level",
      average: averageStress != null ? round2(averageStress) : null,
      scale: "0–40 (PSS)",
    },
    {
      label: "Sleep Risk",
      average: averageSleep != null ? round2(averageSleep) : null,
      scale: "0–100",
    },
    {
      label: "Study Time",
      average: averageStudy != null ? round2(averageStudy) : null,
      scale: "hours / day",
    },
    {
      label: "Academic Workload",
      average: averageWorkload != null ? round2(averageWorkload) : null,
      scale: "0–10",
    },
  ];

  const highRiskStudents = rows
    .filter(
      (r) =>
        riskBucket(r.prediction || r.burnout_level) === "High" ||
        r.early_warning_attention
    )
    .sort((a, b) => (b.mfbi_score ?? 0) - (a.mfbi_score ?? 0))
    .slice(0, 15)
    .map((r) => ({
      id: r.id,
      student_number: r.student_number,
      full_name: r.full_name,
      course: r.course,
      year_level: r.year_level,
      mfbi_score: r.mfbi_score,
      risk: r.early_warning_attention
        ? `${r.prediction || r.burnout_level || "Elevated"} (early warning)`
        : ((r.prediction || r.burnout_level || "High") as string),
      status: r.early_warning_attention
        ? "Early Warning"
        : "Needs Attention",
      monitoring_date: r.monitoring_date ?? null,
      next_week_risk: r.next_week_risk ?? null,
      week2_risk: r.week2_risk ?? null,
      early_warning_trend: r.early_warning_trend ?? null,
    }));

  const earlyWarningStudents = rows
    .filter((r) => r.early_warning_attention)
    .sort((a, b) => (b.mfbi_score ?? 0) - (a.mfbi_score ?? 0))
    .slice(0, 15)
    .map((r) => ({
      id: r.id,
      student_number: r.student_number,
      full_name: r.full_name,
      course: r.course,
      year_level: r.year_level,
      mfbi_score: r.mfbi_score,
      current_risk: (r.prediction || r.burnout_level || "—") as string,
      next_week_risk: r.next_week_risk ?? null,
      week2_risk: r.week2_risk ?? null,
      trend: r.early_warning_trend ?? null,
    }));

  const earlyWarningCount = earlyWarningStudents.length;
  const nextWeekHighCount = rows.filter(
    (r) => r.next_week_risk === "High"
  ).length;
  const week2HighCount = rows.filter((r) => r.week2_risk === "High").length;
  const aiProjectionStudents = rows
    .filter((r) => r.next_week_risk || r.week2_risk)
    .map((r) => ({
      next_week_risk: r.next_week_risk ?? null,
      week2_risk: r.week2_risk ?? null,
    }));

  const previousTrend =
    weeklyTrends.length >= 2 ? weeklyTrends[weeklyTrends.length - 2] : null;
  const latestTrend =
    weeklyTrends.length >= 1 ? weeklyTrends[weeklyTrends.length - 1] : null;

  const topContribution = variableContribution[0];
  const highestYear = [...byYearLevel].sort(
    (a, b) => b.average - a.average
  )[0];
  const highestCourse = [...byCourse].sort(
    (a, b) => b.average - a.average
  )[0];

  const insights: string[] = [];
  if (topContribution?.percent != null) {
    insights.push(
      `${topContribution.label} is the strongest contributor to burnout this week (${topContribution.percent}%).`
    );
  }
  if (
    previousTrend &&
    latestTrend &&
    latestTrend.average < previousTrend.average - 0.01
  ) {
    insights.push(
      `Average burnout score decreased from ${previousTrend.average.toFixed(2)} (Week ${previousTrend.week}) to ${latestTrend.average.toFixed(2)} (Week ${latestTrend.week}).`
    );
  } else if (
    previousTrend &&
    latestTrend &&
    latestTrend.average > previousTrend.average + 0.01
  ) {
    insights.push(
      `Average burnout score increased from ${previousTrend.average.toFixed(2)} (Week ${previousTrend.week}) to ${latestTrend.average.toFixed(2)} (Week ${latestTrend.week}).`
    );
  }
  if (highestYear && highestYear.average > 0) {
    insights.push(
      `${highestYear.label} students show the highest average burnout risk (MFBI ${highestYear.average.toFixed(2)}).`
    );
  }
  if (highestCourse && highestCourse.average > 0) {
    insights.push(
      `${highestCourse.label} has the highest program-level burnout risk (avg MFBI ${highestCourse.average.toFixed(2)}).`
    );
  }
  if (earlyWarningCount > 0) {
    insights.push(
      `${earlyWarningCount} student${earlyWarningCount === 1 ? "" : "s"} flagged by AI early warning (${nextWeekHighCount} next-week High, ${week2HighCount} week-2 High projection).`
    );
  }
  if (highRiskStudents.length > 0) {
    insights.push(
      `Recommend notifying guidance counseling for ${highRiskStudents.length} student${highRiskStudents.length === 1 ? "" : "s"} classified as High Risk or early-warning elevated.`
    );
  }
  if (!insights.length) {
    insights.push(
      "Submit weekly monitoring across departments to generate actionable burnout insights."
    );
  }

  const submittedCount = rows.filter((r) => r.submittedThisWeek).length;
  const completionPercent =
    rows.length > 0
      ? Math.round((submittedCount / rows.length) * 1000) / 10
      : 0;

  return {
    totalStudents: rows.length,
    classifiedCount: classified.length,
    submittedCount,
    completionPercent,
    averageMfbi: avg(mfbiValues),
    averageStress,
    averageWorkload,
    averageStudy,
    averageSleep,
    riskOverview,
    burnoutDistribution,
    departmentComparison,
    weeklyTrends,
    byYearLevel,
    byCourse,
    variableContribution,
    averageScores,
    highRiskStudents,
    earlyWarningStudents,
    aiProjectionStudents,
    earlyWarningCount,
    nextWeekHighCount,
    week2HighCount,
    insights,
  };
}

export type InstructorMonitoringRow = {
  id: string;
  full_name: string;
  email: string | null;
  department_name: string | null;
  is_active: boolean;
  student_count: number;
  submitted_count: number;
  high_risk_count: number;
  average_mfbi: number | null;
};

export async function getInstructorMonitoringRows(
  supabase: SupabaseClient,
  studentRows: GuidanceStudentRow[]
): Promise<InstructorMonitoringRow[]> {
  const { data: instructors } = await supabase
    .from("profiles")
    .select(
      "id, first_name, middle_name, last_name, suffix, is_active, department_id, departments(department_code, department_name, description)"
    )
    .eq("role", "Instructor")
    .order("last_name", { ascending: true });

  return (instructors ?? []).map((instructor) => {
    const deptRaw = instructor.departments as
      | {
          department_code: string;
          department_name: string;
          description: string | null;
        }
      | {
          department_code: string;
          department_name: string;
          description: string | null;
        }[]
      | null;
    const dept = Array.isArray(deptRaw) ? deptRaw[0] : deptRaw;
    const deptStudents = studentRows.filter(
      (s) => s.department_id === instructor.department_id
    );
    const mfbiValues = deptStudents
      .map((s) => s.mfbi_score)
      .filter((n): n is number => n != null);

    return {
      id: instructor.id,
      full_name: buildFullName(instructor),
      email: null,
      department_name:
        dept?.department_name || dept?.description || null,
      is_active: instructor.is_active,
      student_count: deptStudents.length,
      submitted_count: deptStudents.filter((s) => s.submittedThisWeek).length,
      high_risk_count: deptStudents.filter(
        (s) =>
          s.burnout_level === "High" ||
          s.burnout_level === "Severe" ||
          s.prediction === "High" ||
          s.prediction === "Severe"
      ).length,
      average_mfbi: mfbiValues.length
        ? mfbiValues.reduce((a, b) => a + b, 0) / mfbiValues.length
        : null,
    };
  });
}

export function filterGuidanceStudentRows(
  rows: GuidanceStudentRow[],
  filters: GuidanceSearchFilters
) {
  return rows.filter((row) => {
    const q = filters.q?.trim().toLowerCase();
    if (q) {
      const haystack = [row.full_name, row.student_number]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.department_id) {
      if (String(row.department_id) !== filters.department_id) return false;
    }
    if (filters.course?.trim()) {
      const course = filters.course.trim().toLowerCase();
      const haystack = [row.course, row.department_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(course)) return false;
    }
    if (filters.year_level) {
      if (String(row.year_level) !== filters.year_level) return false;
    }
    if (filters.section?.trim()) {
      if (
        (row.section || "").toLowerCase() !==
        filters.section.trim().toLowerCase()
      ) {
        return false;
      }
    }
    if (filters.risk) {
      const level = row.prediction || row.burnout_level;
      if (filters.risk === "High") {
        if (level !== "High" && level !== "Severe") return false;
      } else if (level !== filters.risk) {
        return false;
      }
    }
    return true;
  });
}
