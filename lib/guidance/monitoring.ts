import type { createClient } from "@/lib/supabase/server";
import { buildFullName } from "@/lib/auth/roles";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";
import type {
  StudentHistoryRow,
  StudentMonitorRow,
} from "@/lib/instructor/queries";

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

  let { data: monitoringRows, error: monitoringError } = await monitoringQuery;

  // Fallback if nested ml_predictions embed is unavailable.
  if (monitoringError) {
    let fallbackQuery = supabase
      .from("weekly_monitoring")
      .select(
        "monitoring_id, student_id, week_number, stress_score, academic_workload_score, study_time_score, sleep_hours_score, submitted_at, term_id, created_at, mfbi_results(mfbi_id, mfbi_score, burnout_risk_level)"
      )
      .in("student_id", ids)
      .order("created_at", { ascending: false });

    if (term?.term_id) {
      fallbackQuery = fallbackQuery.eq("term_id", term.term_id);
    }

    const fallback = await fallbackQuery;
    monitoringRows = fallback.data;
    monitoringError = fallback.error;
  }

  if (monitoringError) {
    monitoringRows = [];
  }

  const monitoringList = monitoringRows ?? [];
  const latestMonitoring = new Map<string, (typeof monitoringList)[number]>();
  const submittedThisWeek = new Set<string>();
  const mfbiIds: number[] = [];

  for (const row of monitoringList) {
    if (!latestMonitoring.has(row.student_id)) {
      latestMonitoring.set(row.student_id, row);
      const mfbiRaw = row.mfbi_results;
      const mfbi = Array.isArray(mfbiRaw) ? mfbiRaw[0] : mfbiRaw;
      if (mfbi?.mfbi_id && !(mfbi as { ml_predictions?: unknown }).ml_predictions) {
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

  return students.map((student) => {
    const monitoring = latestMonitoring.get(student.id) ?? null;
    const mfbiRaw = monitoring?.mfbi_results;
    const mfbi = Array.isArray(mfbiRaw) ? mfbiRaw[0] : mfbiRaw;
    const predictionRaw = (mfbi as { ml_predictions?: unknown } | null)
      ?.ml_predictions;
    const nestedPrediction = Array.isArray(predictionRaw)
      ? predictionRaw[0]
      : predictionRaw;
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
      prediction:
        (nestedPrediction as { final_prediction?: string } | null)
          ?.final_prediction ??
        (mfbi?.mfbi_id ? predictionByMfbi.get(mfbi.mfbi_id) ?? null : null),
      monitoring_date: monitoring?.submitted_at ?? null,
      submittedThisWeek: submittedThisWeek.has(student.id),
      department_id: student.department_id,
      department_code: dept?.department_code ?? null,
      department_name:
        dept?.description ||
        (dept
          ? `${dept.department_code} — ${dept.department_name}`
          : null),
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
      monitoring_date: latest?.submitted_at ?? null,
      submittedThisWeek: false,
      department_id: profile.department_id,
      department_code: dept?.department_code ?? null,
      department_name:
        dept?.description ||
        (dept
          ? `${dept.department_code} — ${dept.department_name}`
          : null),
    },
    history,
  };
}

export async function getUniversityWeeklySeries(supabase: SupabaseClient) {
  const term = await getActiveTerm(supabase);
  let query = supabase
    .from("weekly_monitoring")
    .select("week_number, mfbi_results(mfbi_score)");

  if (term?.term_id) {
    query = query.eq("term_id", term.term_id);
  }

  const { data } = await query;

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

export function getGuidanceAnalytics(
  rows: GuidanceStudentRow[],
  weeklyTrends: { week: number; average: number; count: number }[] = []
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

  return {
    totalStudents: rows.length,
    submittedCount: rows.filter((r) => r.submittedThisWeek).length,
    averageMfbi: avg(mfbiValues),
    averageStress: avg(stressValues),
    averageWorkload: avg(workloadValues),
    averageStudy: avg(studyValues),
    averageSleep: avg(sleepValues),
    burnoutDistribution,
    departmentComparison,
    weeklyTrends,
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
        dept?.description ||
        (dept
          ? `${dept.department_code} — ${dept.department_name}`
          : null),
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
