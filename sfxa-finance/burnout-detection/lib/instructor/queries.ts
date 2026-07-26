import type { createClient } from "@/lib/supabase/server";
import { buildFullName } from "@/lib/auth/roles";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type StudentMonitorRow = {
  id: string;
  full_name: string;
  student_number: string | null;
  course: string | null;
  year_level: number | null;
  section: string | null;
  stress_score: number | null;
  stress_level: string | null;
  week_number: number | null;
  academic_workload: number | null;
  study_time: number | null;
  sleep_hours: number | null;
  mfbi_score: number | null;
  burnout_level: string | null;
  prediction: string | null;
  monitoring_date: string | null;
  submittedThisWeek: boolean;
};

export type StudentHistoryRow = {
  monitoring_id: number;
  week_number: number;
  stress_score: number;
  academic_workload: number;
  study_time: number;
  sleep_hours: number;
  submitted_at: string | null;
  mfbi_score: number | null;
  burnout_level: string | null;
  prediction: string | null;
};

export type InstructorDashboardData = {
  totalStudents: number;
  submittedCount: number;
  pendingCount: number;
  averageMfbi: number | null;
  highRiskCount: number;
  currentWeek: number | null;
  departmentName: string | null;
  highRiskStudents: StudentMonitorRow[];
  burnoutDistribution: { label: string; count: number }[];
  notifications: {
    notification_id: number;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }[];
};

export type StudentSearchFilters = {
  q?: string;
  year_level?: string;
  risk?: string;
};

export type AnnouncementRow = {
  announcement_id: number;
  title: string;
  content: string;
  created_by: string | null;
  department_id: number | null;
  course: string | null;
  year_level: number | null;
  section: string | null;
  is_active: boolean;
  publish_date: string | null;
  expiration_date: string | null;
  created_at: string;
  updated_at: string;
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

function matchFilters(row: StudentMonitorRow, filters: StudentSearchFilters) {
  const q = filters.q?.trim().toLowerCase();
  if (q) {
    const haystack = [row.full_name, row.student_number]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (filters.year_level) {
    const year = Number(filters.year_level);
    if (row.year_level !== year) return false;
  }
  if (filters.risk) {
    if (filters.risk === "High") {
      if (row.burnout_level !== "High" && row.burnout_level !== "Severe") {
        return false;
      }
    } else if (row.burnout_level !== filters.risk) {
      return false;
    }
  }

  return true;
}

export async function getDepartmentName(
  supabase: SupabaseClient,
  departmentId: number | null
) {
  if (!departmentId) return null;
  const { data } = await supabase
    .from("departments")
    .select("department_code, department_name, description")
    .eq("department_id", departmentId)
    .maybeSingle();
  if (!data) return null;
  return (
    data.description ||
    `${data.department_code} — ${data.department_name}`
  );
}

export async function getInstructorStudentRows(
  supabase: SupabaseClient,
  departmentId: number | null
): Promise<StudentMonitorRow[]> {
  const term = await getActiveTerm(supabase);
  const currentWeek = term ? getCurrentWeekNumber(term) : null;

  if (!departmentId) return [];

  const { data: students } = await supabase
    .from("profiles")
    .select(
      "id, first_name, middle_name, last_name, suffix, student_number, course, year_level, section, is_active, department_id"
    )
    .eq("role", "Student")
    .eq("is_active", true)
    .eq("department_id", departmentId)
    .order("last_name", { ascending: true });

  if (!students?.length) return [];

  const ids = students.map((s) => s.id);

  let monitoringQuery = supabase
    .from("weekly_monitoring")
    .select(
      "monitoring_id, student_id, week_number, stress_score, academic_workload_score, study_time_score, sleep_hours_score, submitted_at, term_id, created_at, mfbi_results(mfbi_id, mfbi_score, burnout_risk_level, ml_predictions(final_prediction))"
    )
    .in("student_id", ids)
    .order("created_at", { ascending: false });

  if (term?.term_id) {
    monitoringQuery = monitoringQuery.eq("term_id", term.term_id);
  }

  const { data: monitoringRows } = await monitoringQuery;

  const monitoringList = monitoringRows ?? [];
  const latestMonitoring = new Map<string, (typeof monitoringList)[number]>();
  const submittedThisWeek = new Set<string>();

  for (const row of monitoringList) {
    if (!latestMonitoring.has(row.student_id)) {
      latestMonitoring.set(row.student_id, row);
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

  return students.map((student) => {
    const monitoring = latestMonitoring.get(student.id) ?? null;
    const mfbiRaw = monitoring?.mfbi_results;
    const mfbi = Array.isArray(mfbiRaw) ? mfbiRaw[0] : mfbiRaw;
    const predictionRaw = mfbi?.ml_predictions;
    const prediction = Array.isArray(predictionRaw)
      ? predictionRaw[0]
      : predictionRaw;
    const stressScore =
      monitoring?.stress_score != null ? Number(monitoring.stress_score) : null;

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
      prediction: prediction?.final_prediction ?? null,
      monitoring_date: monitoring?.submitted_at ?? null,
      submittedThisWeek: submittedThisWeek.has(student.id),
    };
  });
}

export async function getStudentAssessmentHistory(
  supabase: SupabaseClient,
  studentId: string,
  departmentId: number | null
): Promise<{
  student: StudentMonitorRow | null;
  history: StudentHistoryRow[];
}> {
  if (!departmentId) return { student: null, history: [] };

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, first_name, middle_name, last_name, suffix, student_number, course, year_level, section, department_id, role, is_active"
    )
    .eq("id", studentId)
    .eq("role", "Student")
    .eq("department_id", departmentId)
    .maybeSingle();

  if (!profile) return { student: null, history: [] };

  const { data: monitoringRows } = await supabase
    .from("weekly_monitoring")
    .select(
      "monitoring_id, week_number, stress_score, academic_workload_score, study_time_score, sleep_hours_score, submitted_at, mfbi_results(mfbi_id, mfbi_score, burnout_risk_level)"
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

  const predictionByMfbi = new Map<number, string>();
  if (mfbiIds.length) {
    const { data: predictions } = await supabase
      .from("ml_predictions")
      .select("mfbi_id, final_prediction")
      .in("mfbi_id", mfbiIds);
    for (const prediction of predictions ?? []) {
      predictionByMfbi.set(prediction.mfbi_id, prediction.final_prediction);
    }
  }

  const history: StudentHistoryRow[] = rows.map((row) => {
    const mfbi = Array.isArray(row.mfbi_results)
      ? row.mfbi_results[0]
      : row.mfbi_results;
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
      prediction: mfbi?.mfbi_id
        ? predictionByMfbi.get(mfbi.mfbi_id) ?? null
        : null,
    };
  });

  const latest = history[0] ?? null;

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
      monitoring_date: latest?.submitted_at ?? null,
      submittedThisWeek: false,
    },
    history,
  };
}

export async function getDepartmentWeeklySeries(
  supabase: SupabaseClient,
  departmentId: number | null
) {
  if (!departmentId) return [] as { week: number; average: number; count: number }[];

  const { data: students } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "Student")
    .eq("is_active", true)
    .eq("department_id", departmentId);

  const ids = (students ?? []).map((s) => s.id);
  if (!ids.length) return [];

  const { data } = await supabase
    .from("weekly_monitoring")
    .select("week_number, mfbi_results(mfbi_score)")
    .in("student_id", ids);

  const weeklyMap = new Map<number, number[]>();
  for (const row of data ?? []) {
    const mfbi = Array.isArray(row.mfbi_results)
      ? row.mfbi_results[0]
      : row.mfbi_results;
    if (row.week_number == null || mfbi?.mfbi_score == null) continue;
    const list = weeklyMap.get(row.week_number) ?? [];
    list.push(Number(mfbi.mfbi_score));
    weeklyMap.set(row.week_number, list);
  }

  return [...weeklyMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([week, scores]) => ({
      week,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    }));
}

export async function getInstructorDashboardData(
  supabase: SupabaseClient,
  instructorId: string,
  departmentId: number | null
): Promise<InstructorDashboardData> {
  const [term, rows, departmentName, notificationResult] = await Promise.all([
    getActiveTerm(supabase),
    getInstructorStudentRows(supabase, departmentId),
    getDepartmentName(supabase, departmentId),
    supabase
      .from("notifications")
      .select("notification_id, title, message, is_read, created_at")
      .eq("user_id", instructorId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const currentWeek = term ? getCurrentWeekNumber(term) : null;

  const submittedCount = rows.filter((r) => r.submittedThisWeek).length;
  const mfbiValues = rows
    .map((r) => r.mfbi_score)
    .filter((n): n is number => n != null);
  const averageMfbi =
    mfbiValues.length > 0
      ? mfbiValues.reduce((a, b) => a + b, 0) / mfbiValues.length
      : null;

  const highRiskStudents = rows.filter(
    (r) =>
      r.burnout_level === "High" ||
      r.burnout_level === "Severe" ||
      r.prediction === "High" ||
      r.prediction === "Severe"
  );

  const burnoutDistribution = countBy(
    rows
      .map((r) => r.prediction || r.burnout_level)
      .filter(Boolean) as string[]
  );

  return {
    totalStudents: rows.length,
    submittedCount,
    pendingCount: Math.max(rows.length - submittedCount, 0),
    averageMfbi,
    highRiskCount: highRiskStudents.length,
    currentWeek,
    departmentName,
    highRiskStudents: highRiskStudents.slice(0, 5),
    burnoutDistribution,
    notifications: notificationResult.data ?? [],
  };
}

export function filterStudentRows(
  rows: StudentMonitorRow[],
  filters: StudentSearchFilters
) {
  return rows.filter((row) => matchFilters(row, filters));
}

export function getInstructorAnalytics(
  rows: StudentMonitorRow[],
  weeklyTrends: { week: number; average: number; count: number }[] = []
) {
  const mfbiValues = rows
    .map((r) => r.mfbi_score)
    .filter((n): n is number => n != null);
  const averageMfbi =
    mfbiValues.length > 0
      ? mfbiValues.reduce((a, b) => a + b, 0) / mfbiValues.length
      : null;

  const stressValues = rows
    .map((r) => r.stress_score)
    .filter((n): n is number => n != null);
  const averageStress =
    stressValues.length > 0
      ? stressValues.reduce((a, b) => a + b, 0) / stressValues.length
      : null;

  const burnoutDistribution = countBy(
    rows
      .map((r) => r.prediction || r.burnout_level)
      .filter(Boolean) as string[]
  );
  const stressDistribution = countBy(
    rows.map((r) => r.stress_level).filter(Boolean) as string[]
  );

  const monthlyMap = new Map<string, number[]>();
  for (const row of rows) {
    if (!row.monitoring_date || row.mfbi_score == null) continue;
    const month = row.monitoring_date.slice(0, 7);
    const list = monthlyMap.get(month) ?? [];
    list.push(row.mfbi_score);
    monthlyMap.set(month, list);
  }

  const monthlyTrends = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, scores]) => ({
      month,
      average: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    }));

  return {
    averageMfbi,
    averageStress,
    burnoutDistribution,
    stressDistribution,
    weeklyTrends,
    monthlyTrends,
    totalStudents: rows.length,
    submittedCount: rows.filter((r) => r.submittedThisWeek).length,
  };
}
