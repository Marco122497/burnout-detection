import type { createClient } from "@/lib/supabase/server";
import { buildFullName } from "@/lib/auth/roles";
import { STUDY_TIME_SCORE_MAX } from "@/lib/student/scale-options";
import { reconcileMonitoringStudyDisplay } from "@/lib/student/monitoring-display";
import { resolveMfbiBurnoutLevel } from "@/lib/student/mfbi";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";
import { fetchAllPages } from "@/lib/supabase/fetch-all"; 
import { buildGenderRiskSummary } from "@/lib/reports/gender-risk";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type StudentMonitorRow = {
  id: string;
  full_name: string;
  student_number: string | null;
  email?: string | null;
  profile_picture?: string | null;
  sex?: "Male" | "Female" | null;
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
  early_warning_attention?: boolean;
  next_week_risk?: string | null;
  week2_risk?: string | null;
  early_warning_trend?: string | null;
  has_ml_next_week?: boolean;
  previous_mfbi_score: number | null;
  previous_burnout_level: string | null;
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
  prediction_remarks?: string | null;
  normalized_stress: number | null;
  normalized_workload: number | null;
  normalized_study_time: number | null;
  normalized_sleep: number | null;
};

export type InstructorDashboardData = {
  totalStudents: number;
  monitoredCount: number;
  submittedCount: number;
  pendingCount: number;
  completionPercent: number;
  lowRiskCount: number;
  moderateRiskCount: number;
  highRiskCount: number;
  earlyWarningCount: number;
  nextWeekHighCount: number;
  week2HighCount: number;
  lowRiskPercent: number;
  moderateRiskPercent: number;
  highRiskPercent: number;
  currentWeek: number | null;
  departmentName: string | null;
  academicYear: string | null;
  semester: string | null;
  yearStats: {
    year_level: number;
    total: number;
    monitored: number;
    submitted: number;
    low: number;
    moderate: number;
    high: number;
  }[];
  riskByClass: {
    label: string;
    year_level: number | null;
    low: number;
    moderate: number;
    high: number;
    elevated: number;
  }[];
  weeklyTrends: {
    week: number;
    average: number;
    count: number;
    lowCount: number;
    moderateCount: number;
    highCount: number;
  }[];
  attentionStudents: {
    id: string;
    full_name: string;
    student_number: string | null;
    classLabel: string;
    year_level: number | null;
    risk: string;
    mfbi_score: number | null;
    mainConcern: string;
    monitoring_date: string | null;
    next_week_risk?: string | null;
    week2_risk?: string | null;
    early_warning_trend?: string | null;
  }[];
  earlyWarningStudents: {
    id: string;
    full_name: string;
    student_number: string | null;
    classLabel: string;
    year_level: number | null;
    current_risk: string;
    next_week_risk: string | null;
    week2_risk: string | null;
    trend: string | null;
    mfbi_score: number | null;
  }[];
  riskFactors: { label: string; count: number }[];
  pendingStudents: {
    id: string;
    full_name: string;
    student_number: string | null;
    classLabel: string;
  }[];
  recentAlerts: { tone: "high" | "moderate" | "low" | "info"; text: string; meta: string }[];
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
    const level = rowMfbiRiskBucket(row);
    if (filters.risk === "High") {
      if (level !== "High") return false;
    } else if (level !== filters.risk) {
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
  return data.department_name || data.description || null;
}

export async function getInstructorStudentRows(
  supabase: SupabaseClient,
  departmentId: number | null
): Promise<StudentMonitorRow[]> {
  const term = await getActiveTerm(supabase);
  const currentWeek = term ? getCurrentWeekNumber(term) : null;

  if (!departmentId) return [];

  const students = await fetchAllPages(async (from, to) =>
    supabase
      .from("profiles")
      .select(
        "id, first_name, middle_name, last_name, suffix, student_number, sex, course, year_level, section, is_active, department_id, profile_picture"
      )
      .eq("role", "Student")
      .eq("is_active", true)
      .eq("department_id", departmentId)
      .order("last_name", { ascending: true })
      .range(from, to)
  );

  if (!students.length) return [];

  const ids = students.map((s) => s.id);
  type MonitoringRow = {
    monitoring_id: number;
    student_id: string;
    week_number: number;
    stress_score: number;
    academic_workload_score: number;
    study_time_score: number;
    sleep_hours_score: number;
    submitted_at: string | null;
    term_id: number;
    created_at: string;
    mfbi_results: {
      mfbi_id: number;
      mfbi_score: number;
      burnout_risk_level: string;
      ml_predictions:
        | { final_prediction: string; remarks: string | null }
        | { final_prediction: string; remarks: string | null }[]
        | null;
    } | {
      mfbi_id: number;
      mfbi_score: number;
      burnout_risk_level: string;
      ml_predictions:
        | { final_prediction: string; remarks: string | null }
        | { final_prediction: string; remarks: string | null }[]
        | null;
    }[] | null;
  };
  const monitoringList: MonitoringRow[] = [];

  const idChunkSize = 200;
  for (let index = 0; index < ids.length; index += idChunkSize) {
    const chunk = ids.slice(index, index + idChunkSize);
    const chunkRows = await fetchAllPages(async (from, to) => {
      let monitoringQuery = supabase
        .from("weekly_monitoring")
        .select(
          "monitoring_id, student_id, week_number, stress_score, academic_workload_score, study_time_score, sleep_hours_score, submitted_at, term_id, created_at, mfbi_results(mfbi_id, mfbi_score, burnout_risk_level, ml_predictions(final_prediction, remarks))"
        )
        .in("student_id", chunk)
        .order("created_at", { ascending: false });

      if (term?.term_id) {
        monitoringQuery = monitoringQuery.eq("term_id", term.term_id);
      }

      return monitoringQuery.range(from, to);
    });
    monitoringList.push(...chunkRows);
  }

  const latestMonitoring = new Map<string, (typeof monitoringList)[number]>();
  const previousMonitoring = new Map<string, (typeof monitoringList)[number]>();
  const submittedThisWeek = new Set<string>();

  for (const row of monitoringList) {
    if (!latestMonitoring.has(row.student_id)) {
      latestMonitoring.set(row.student_id, row);
    } else if (!previousMonitoring.has(row.student_id)) {
      const latest = latestMonitoring.get(row.student_id);
      if (
        latest &&
        (row.week_number !== latest.week_number ||
          row.monitoring_id !== latest.monitoring_id)
      ) {
        previousMonitoring.set(row.student_id, row);
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

  const { staffEarlyWarningFromRemarks } = await import(
    "@/lib/student/early-warning-staff"
  );

  return students.map((student) => {
    const monitoring = latestMonitoring.get(student.id) ?? null;
    const previous = previousMonitoring.get(student.id) ?? null;
    const mfbiRaw = monitoring?.mfbi_results;
    const mfbi = Array.isArray(mfbiRaw) ? mfbiRaw[0] : mfbiRaw;
    const previousMfbiRaw = previous?.mfbi_results;
    const previousMfbi = Array.isArray(previousMfbiRaw)
      ? previousMfbiRaw[0]
      : previousMfbiRaw;
    const predictionRaw = mfbi?.ml_predictions;
    const prediction = Array.isArray(predictionRaw)
      ? predictionRaw[0]
      : predictionRaw;
    const stressScore =
      monitoring?.stress_score != null ? Number(monitoring.stress_score) : null;

    const ew = staffEarlyWarningFromRemarks(prediction?.remarks);

    return {
      id: student.id,
      full_name: buildFullName(student),
      student_number: student.student_number,
      profile_picture: student.profile_picture ?? null,
      sex:
        student.sex === "Male" || student.sex === "Female" ? student.sex : null,
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
      early_warning_attention: ew.early_warning_attention,
      next_week_risk: ew.next_week_risk,
      week2_risk: ew.week2_risk,
      early_warning_trend: ew.early_warning_trend,
      has_ml_next_week: ew.has_ml_next_week,
      previous_mfbi_score:
        previousMfbi?.mfbi_score != null
          ? Number(previousMfbi.mfbi_score)
          : null,
      previous_burnout_level: previousMfbi?.burnout_risk_level ?? null,
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
      "id, first_name, middle_name, last_name, suffix, student_number, sex, course, year_level, section, department_id, role, is_active"
    )
    .eq("id", studentId)
    .eq("role", "Student")
    .eq("department_id", departmentId)
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
    return reconcileMonitoringStudyDisplay({
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
    });
  });

  const latest = history[0] ?? null;
  const previous = history[1] ?? null;

  return {
    student: {
      id: profile.id,
      full_name: buildFullName(profile),
      student_number: profile.student_number,
      sex:
        profile.sex === "Male" || profile.sex === "Female" ? profile.sex : null,
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
    },
    history,
  };
}

export async function getDepartmentWeeklySeries(
  supabase: SupabaseClient,
  departmentId: number | null,
  range?: { from?: string; to?: string }
) {
  if (!departmentId) {
    return [] as {
      week: number;
      average: number;
      count: number;
      lowCount: number;
      moderateCount: number;
      highCount: number;
    }[];
  }

  const { data: students } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "Student")
    .eq("is_active", true)
    .eq("department_id", departmentId);

  const ids = (students ?? []).map((s) => s.id);
  if (!ids.length) return [];

  let query = supabase
    .from("weekly_monitoring")
    .select(
      "week_number, submitted_at, created_at, mfbi_results(mfbi_score, burnout_risk_level)"
    )
    .in("student_id", ids);

  if (range?.from) {
    query = query.gte("submitted_at", `${range.from}T00:00:00`);
  }
  if (range?.to) {
    query = query.lte("submitted_at", `${range.to}T23:59:59.999`);
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
      const score = Number(mfbi.mfbi_score);
      entry.scores.push(score);
      const level = resolveMfbiBurnoutLevel(score, mfbi.burnout_risk_level);
      if (level === "Low") entry.low += 1;
      else if (level === "Moderate") entry.moderate += 1;
      else if (level === "High" || level === "Severe") entry.high += 1;
    }

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

function classLabel(row: StudentMonitorRow) {
  const year = row.year_level != null ? String(row.year_level) : "";
  const section = row.section?.trim() ?? "";
  const course = row.course?.trim() ?? "";
  if (course && year && section) return `${course} ${year}${section}`;
  if (course && year) return `${course} ${year}`;
  if (year && section) return `${year}${section}`;
  return course || "Unassigned";
}

function riskBucket(
  level: string | null | undefined
): "Low" | "Moderate" | "High" | null {
  if (!level) return null;
  if (level === "Low") return "Low";
  if (level === "Moderate") return "Moderate";
  if (level === "High" || level === "Severe") return "High";
  return null;
}

function rowMfbiRiskLevel(row: StudentMonitorRow) {
  return resolveMfbiBurnoutLevel(row.mfbi_score, row.burnout_level);
}

function rowMfbiRiskBucket(
  row: StudentMonitorRow
): "Low" | "Moderate" | "High" | null {
  const level = rowMfbiRiskLevel(row);
  return level ? riskBucket(level) : null;
}

function rowMfbiRiskLabel(
  row: StudentMonitorRow,
  options?: { includeEarlyWarning?: boolean; fallback?: string }
) {
  const base = rowMfbiRiskLevel(row) ?? options?.fallback ?? "—";
  if (options?.includeEarlyWarning !== false && row.early_warning_attention) {
    return `${base} (early warning)`;
  }
  return base;
}

function mainConcern(row: StudentMonitorRow) {
  const candidates = [
    {
      label: "High Stress",
      score: row.stress_score != null ? row.stress_score / 40 : 0,
    },
    {
      label: "Heavy Workload",
      score:
        row.academic_workload != null ? row.academic_workload / 10 : 0,
    },
    {
      label: "Insufficient Sleep",
      score: row.sleep_hours != null ? row.sleep_hours / 100 : 0,
    },
    {
      label: "Excessive Study Time",
      score: row.study_time != null ? row.study_time / STUDY_TIME_SCORE_MAX : 0,
    },
  ].sort((a, b) => b.score - a.score);

  const top = candidates[0];
  return top && top.score > 0.15 ? top.label : "—";
}

function formatDepartmentScope(name: string | null) {
  if (!name) return null;
  if (/^department\b/i.test(name)) return name;
  return `Department of ${name}`;
}

export async function getInstructorDashboardData(
  supabase: SupabaseClient,
  instructorId: string,
  departmentId: number | null
): Promise<InstructorDashboardData> {
  const [term, rows, departmentName, weeklyTrends, notificationResult] =
    await Promise.all([
      getActiveTerm(supabase),
      getInstructorStudentRows(supabase, departmentId),
      getDepartmentName(supabase, departmentId),
      getDepartmentWeeklySeries(supabase, departmentId),
      supabase
        .from("notifications")
        .select("notification_id, title, message, is_read, created_at")
        .eq("user_id", instructorId)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

  const currentWeek = term ? getCurrentWeekNumber(term) : null;
  const totalStudents = rows.length;
  const submittedCount = rows.filter((r) => r.submittedThisWeek).length;
  const pendingCount = Math.max(totalStudents - submittedCount, 0);
  const completionPercent =
    totalStudents > 0
      ? Math.round((submittedCount / totalStudents) * 1000) / 10
      : 0;

  const monitoredCount = rows.filter(
    (r) => r.mfbi_score != null || r.prediction || r.burnout_level
  ).length;

  const classified = rows
    .map((r) => ({
      row: r,
      bucket: rowMfbiRiskBucket(r),
    }))
    .filter(
      (
        item
      ): item is {
        row: StudentMonitorRow;
        bucket: "Low" | "Moderate" | "High";
      } => item.bucket != null
    );

  const lowRiskCount = classified.filter((i) => i.bucket === "Low").length;
  const moderateRiskCount = classified.filter(
    (i) => i.bucket === "Moderate"
  ).length;
  const highRiskCount = classified.filter((i) => i.bucket === "High").length;

  const pct = (count: number) =>
    totalStudents > 0
      ? Math.round((count / totalStudents) * 1000) / 10
      : 0;

  const yearStatsMap = new Map<
    number,
    {
      total: number;
      monitored: number;
      submitted: number;
      low: number;
      moderate: number;
      high: number;
    }
  >();

  const classStatsMap = new Map<
    string,
    {
      year_level: number | null;
      low: number;
      moderate: number;
      high: number;
    }
  >();

  for (const row of rows) {
    const year = row.year_level;
    if (year != null) {
      const yearEntry = yearStatsMap.get(year) ?? {
        total: 0,
        monitored: 0,
        submitted: 0,
        low: 0,
        moderate: 0,
        high: 0,
      };
      yearEntry.total += 1;
      if (row.mfbi_score != null || row.prediction || row.burnout_level) {
        yearEntry.monitored += 1;
      }
      if (row.submittedThisWeek) yearEntry.submitted += 1;
      const bucket = rowMfbiRiskBucket(row);
      if (bucket === "Low") yearEntry.low += 1;
      else if (bucket === "Moderate") yearEntry.moderate += 1;
      else if (bucket === "High") yearEntry.high += 1;
      yearStatsMap.set(year, yearEntry);
    }

    const label = classLabel(row);
    const classEntry = classStatsMap.get(label) ?? {
      year_level: row.year_level,
      low: 0,
      moderate: 0,
      high: 0,
    };
    const bucket = rowMfbiRiskBucket(row);
    if (bucket === "Low") classEntry.low += 1;
    else if (bucket === "Moderate") classEntry.moderate += 1;
    else if (bucket === "High") classEntry.high += 1;
    classStatsMap.set(label, classEntry);
  }

  const yearStats = [...yearStatsMap.entries()]
    .map(([year_level, stats]) => ({ year_level, ...stats }))
    .sort((a, b) => a.year_level - b.year_level);

  const riskByClass = [...classStatsMap.entries()]
    .map(([label, stats]) => ({
      label,
      year_level: stats.year_level,
      low: stats.low,
      moderate: stats.moderate,
      high: stats.high,
      elevated: stats.moderate + stats.high,
    }))
    .sort((a, b) => b.elevated - a.elevated || a.label.localeCompare(b.label));

  const attentionStudents = classified
    .filter((i) => i.bucket === "High")
    .sort((a, b) => (b.row.mfbi_score ?? 0) - (a.row.mfbi_score ?? 0))
    .slice(0, 12)
    .map(({ row, bucket }) => ({
      id: row.id,
      full_name: row.full_name,
      student_number: row.student_number,
      classLabel: classLabel(row),
      year_level: row.year_level,
      risk: rowMfbiRiskLabel(row, { fallback: bucket }),
      mfbi_score: row.mfbi_score,
      mainConcern: mainConcern(row),
      monitoring_date: row.monitoring_date,
      next_week_risk: row.next_week_risk ?? null,
      week2_risk: row.week2_risk ?? null,
      early_warning_trend: row.early_warning_trend ?? null,
    }));

  const earlyWarningStudents = rows
    .filter((r) => r.early_warning_attention)
    .sort((a, b) => (b.mfbi_score ?? 0) - (a.mfbi_score ?? 0))
    .slice(0, 15)
    .map((row) => ({
      id: row.id,
      full_name: row.full_name,
      student_number: row.student_number,
      classLabel: classLabel(row),
      year_level: row.year_level,
      current_risk: rowMfbiRiskLabel(row, {
        includeEarlyWarning: false,
        fallback: "—",
      }),
      next_week_risk: row.next_week_risk ?? null,
      week2_risk: row.week2_risk ?? null,
      trend: row.early_warning_trend ?? null,
      mfbi_score: row.mfbi_score,
    }));

  const earlyWarningCount = earlyWarningStudents.length;
  const nextWeekHighCount = rows.filter(
    (r) => r.next_week_risk === "High"
  ).length;
  const week2HighCount = rows.filter((r) => r.week2_risk === "High").length;

  const assessed = rows.filter(
    (r) =>
      r.stress_score != null ||
      r.academic_workload != null ||
      r.sleep_hours != null ||
      r.study_time != null
  );

  const riskFactors = [
    {
      label: "High Stress",
      count: assessed.filter(
        (r) =>
          (r.stress_score != null && r.stress_score > 26) ||
          r.stress_level === "High"
      ).length,
    },
    {
      label: "Heavy Workload",
      count: assessed.filter(
        (r) => r.academic_workload != null && r.academic_workload >= 7
      ).length,
    },
    {
      label: "Insufficient Sleep",
      count: assessed.filter(
        (r) => r.sleep_hours != null && r.sleep_hours >= 50
      ).length,
    },
    {
      label: "Excessive Study Time",
      count: assessed.filter(
        (r) => r.study_time != null && r.study_time >= 18
      ).length,
    },
  ].sort((a, b) => b.count - a.count);

  const pendingStudents = rows
    .filter((r) => !r.submittedThisWeek)
    .slice(0, 20)
    .map((r) => ({
      id: r.id,
      full_name: r.full_name,
      student_number: r.student_number,
      classLabel: classLabel(r),
    }));

  const previousTrend =
    weeklyTrends.length >= 2 ? weeklyTrends[weeklyTrends.length - 2] : null;
  const latestTrend =
    weeklyTrends.length >= 1 ? weeklyTrends[weeklyTrends.length - 1] : null;

  const recentAlerts: InstructorDashboardData["recentAlerts"] = [];

  if (latestTrend && previousTrend) {
    const highDelta = latestTrend.highCount - previousTrend.highCount;
    const modDelta = latestTrend.moderateCount - previousTrend.moderateCount;
    const lowDelta = latestTrend.lowCount - previousTrend.lowCount;

    if (highDelta > 0) {
      recentAlerts.push({
        tone: "high",
        text: `${highDelta} student${highDelta === 1 ? "" : "s"} moved into High Risk`,
        meta: `Week ${latestTrend.week}`,
      });
    }
    if (modDelta > 0) {
      recentAlerts.push({
        tone: "moderate",
        text: `${modDelta} student${modDelta === 1 ? "" : "s"} showed increasing moderate risk`,
        meta: `Week ${latestTrend.week}`,
      });
    }
    if (lowDelta > 0 && (highDelta < 0 || modDelta < 0)) {
      recentAlerts.push({
        tone: "low",
        text: `${lowDelta} student${lowDelta === 1 ? "" : "s"} improved toward Low Risk`,
        meta: `Week ${latestTrend.week}`,
      });
    }
  }

  if (highRiskCount > 0) {
    recentAlerts.push({
      tone: "high",
      text: `${highRiskCount} student${highRiskCount === 1 ? "" : "s"} currently at High Risk`,
      meta: "Latest snapshot",
    });
  }

  if (earlyWarningCount > 0) {
    recentAlerts.push({
      tone: "moderate",
      text: `${earlyWarningCount} student${earlyWarningCount === 1 ? "" : "s"} flagged by AI early-warning outlook (${nextWeekHighCount} next-week High)`,
      meta: "Next-week / trend projection",
    });
  }
  if (pendingCount > 0) {
    recentAlerts.push({
      tone: "moderate",
      text: `${pendingCount} student${pendingCount === 1 ? "" : "s"} have incomplete monitoring`,
      meta: currentWeek ? `Week ${currentWeek}` : "This week",
    });
  }
  if (!recentAlerts.length) {
    recentAlerts.push({
      tone: "info",
      text: "No early warnings in the current monitoring window",
      meta: "Up to date",
    });
  }

  return {
    totalStudents,
    monitoredCount,
    submittedCount,
    pendingCount,
    completionPercent,
    lowRiskCount,
    moderateRiskCount,
    highRiskCount,
    earlyWarningCount,
    nextWeekHighCount,
    week2HighCount,
    lowRiskPercent: pct(lowRiskCount),
    moderateRiskPercent: pct(moderateRiskCount),
    highRiskPercent: pct(highRiskCount),
    currentWeek,
    departmentName: formatDepartmentScope(departmentName),
    academicYear: term?.academic_year ?? null,
    semester: term?.semester ?? null,
    yearStats,
    riskByClass,
    weeklyTrends,
    attentionStudents,
    earlyWarningStudents,
    riskFactors,
    pendingStudents,
    recentAlerts: recentAlerts.slice(0, 6),
    notifications: notificationResult.data ?? [],
  };
}

export function filterStudentRows(
  rows: StudentMonitorRow[],
  filters: StudentSearchFilters
) {
  return rows.filter((row) => matchFilters(row, filters));
}

function mainRiskFactor(row: StudentMonitorRow) {
  const concern = mainConcern(row);
  if (concern === "High Stress") return "Stress";
  if (concern === "Heavy Workload") return "Workload";
  if (concern === "Insufficient Sleep") return "Sleep";
  if (concern === "Excessive Study Time") return "Study Time";
  return concern;
}

function riskTrend(row: StudentMonitorRow): "up" | "down" | "stable" {
  const rank = (level: string | null | undefined) => {
    const bucket = riskBucket(level);
    if (bucket === "High") return 3;
    if (bucket === "Moderate") return 2;
    if (bucket === "Low") return 1;
    return 0;
  };

  const currentRank = rank(rowMfbiRiskLevel(row));
  const previousRank = rank(
    resolveMfbiBurnoutLevel(row.previous_mfbi_score, row.previous_burnout_level)
  );

  if (currentRank && previousRank) {
    if (currentRank > previousRank) return "up";
    if (currentRank < previousRank) return "down";
  }

  if (row.mfbi_score != null && row.previous_mfbi_score != null) {
    const delta = row.mfbi_score - row.previous_mfbi_score;
    if (delta > 0.03) return "up";
    if (delta < -0.03) return "down";
  }

  return "stable";
}

export function getInstructorAnalytics(
  rows: StudentMonitorRow[],
  weeklyTrends: {
    week: number;
    average: number;
    count: number;
    lowCount?: number;
    moderateCount?: number;
    highCount?: number;
  }[] = []
) {
  const riskOverview = (["Low", "Moderate", "High"] as const).map((label) => {
    const count = rows.filter((r) => rowMfbiRiskBucket(r) === label).length;
    const classifiedTotal =
      rows.filter((r) => rowMfbiRiskBucket(r) != null).length || 1;
    return {
      label,
      count,
      percent: Math.round((count / classifiedTotal) * 1000) / 10,
    };
  });

  const monitoredCount = rows.filter(
    (r) => r.mfbi_score != null || r.prediction || r.burnout_level
  ).length;

  const lowRiskCount =
    riskOverview.find((r) => r.label === "Low")?.count ?? 0;
  const moderateRiskCount =
    riskOverview.find((r) => r.label === "Moderate")?.count ?? 0;
  const highRiskCount =
    riskOverview.find((r) => r.label === "High")?.count ?? 0;

  const yearStatsMap = new Map<
    number,
    {
      total: number;
      monitored: number;
      submitted: number;
      low: number;
      moderate: number;
      high: number;
    }
  >();

  const classStatsMap = new Map<
    string,
    {
      year_level: number | null;
      total: number;
      low: number;
      moderate: number;
      high: number;
    }
  >();

  for (const row of rows) {
    if (row.year_level != null) {
      const yearEntry = yearStatsMap.get(row.year_level) ?? {
        total: 0,
        monitored: 0,
        submitted: 0,
        low: 0,
        moderate: 0,
        high: 0,
      };
      yearEntry.total += 1;
      if (row.mfbi_score != null || row.prediction || row.burnout_level) {
        yearEntry.monitored += 1;
      }
      if (row.submittedThisWeek) yearEntry.submitted += 1;
      const bucket = rowMfbiRiskBucket(row);
      if (bucket === "Low") yearEntry.low += 1;
      else if (bucket === "Moderate") yearEntry.moderate += 1;
      else if (bucket === "High") yearEntry.high += 1;
      yearStatsMap.set(row.year_level, yearEntry);
    }

    const label = classLabel(row);
    const classEntry = classStatsMap.get(label) ?? {
      year_level: row.year_level,
      total: 0,
      low: 0,
      moderate: 0,
      high: 0,
    };
    classEntry.total += 1;
    const bucket = rowMfbiRiskBucket(row);
    if (bucket === "Low") classEntry.low += 1;
    else if (bucket === "Moderate") classEntry.moderate += 1;
    else if (bucket === "High") classEntry.high += 1;
    classStatsMap.set(label, classEntry);
  }

  const yearStats = [...yearStatsMap.entries()]
    .map(([year_level, stats]) => ({ year_level, ...stats }))
    .sort((a, b) => a.year_level - b.year_level);

  const riskByClass = [...classStatsMap.entries()]
    .map(([label, stats]) => ({
      label,
      year_level: stats.year_level,
      total: stats.total,
      low: stats.low,
      moderate: stats.moderate,
      high: stats.high,
      elevated: stats.moderate + stats.high,
    }))
    .sort((a, b) => b.elevated - a.elevated || a.label.localeCompare(b.label));

  const classOptions = riskByClass
    .map((item) => item.label)
    .filter((label) => label !== "Unassigned");

  const attentionStudents = rows
    .map((row) => {
      const bucket = rowMfbiRiskBucket(row);
      if (bucket !== "High") {
        return null;
      }
      return {
        id: row.id,
        full_name: row.full_name,
        student_number: row.student_number,
        classLabel: classLabel(row),
        year_level: row.year_level,
        risk: rowMfbiRiskLabel(row, { fallback: bucket ?? "Elevated" }),
        mfbi_score: row.mfbi_score,
        mainFactor: mainRiskFactor(row),
        trend: riskTrend(row),
        next_week_risk: row.next_week_risk ?? null,
        week2_risk: row.week2_risk ?? null,
        early_warning_trend: row.early_warning_trend ?? null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
    .sort((a, b) => (b.mfbi_score ?? 0) - (a.mfbi_score ?? 0));

  const earlyWarningStudents = rows
    .filter((r) => r.early_warning_attention)
    .sort((a, b) => (b.mfbi_score ?? 0) - (a.mfbi_score ?? 0))
    .slice(0, 15)
    .map((row) => ({
      id: row.id,
      full_name: row.full_name,
      student_number: row.student_number,
      classLabel: classLabel(row),
      year_level: row.year_level,
      current_risk: rowMfbiRiskLabel(row, {
        includeEarlyWarning: false,
        fallback: "—",
      }),
      next_week_risk: row.next_week_risk ?? null,
      week2_risk: row.week2_risk ?? null,
      trend: row.early_warning_trend ?? null,
      mfbi_score: row.mfbi_score,
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
      year_level: r.year_level,
    }));

  const assessed = rows.filter(
    (r) =>
      r.stress_score != null ||
      r.academic_workload != null ||
      r.sleep_hours != null ||
      r.study_time != null
  );

  const riskFactors = [
    {
      label: "Stress Level",
      count: assessed.filter(
        (r) =>
          (r.stress_score != null && r.stress_score > 26) ||
          r.stress_level === "High"
      ).length,
    },
    {
      label: "Academic Workload",
      count: assessed.filter(
        (r) => r.academic_workload != null && r.academic_workload >= 7
      ).length,
    },
    {
      label: "Study Time",
      count: assessed.filter((r) => r.study_time != null && r.study_time >= 18)
        .length,
    },
    {
      label: "Sleep Hours",
      count: assessed.filter((r) => r.sleep_hours != null && r.sleep_hours >= 50)
        .length,
    },
  ].sort((a, b) => b.count - a.count);

  const submittedCount = rows.filter((r) => r.submittedThisWeek).length;
  const pendingCount = Math.max(rows.length - submittedCount, 0);
  const completionPercent =
    rows.length > 0
      ? Math.round((submittedCount / rows.length) * 1000) / 10
      : 0;

  const previousTrend =
    weeklyTrends.length >= 2 ? weeklyTrends[weeklyTrends.length - 2] : null;
  const latestTrend =
    weeklyTrends.length >= 1 ? weeklyTrends[weeklyTrends.length - 1] : null;

  const recentChanges: {
    tone: "high" | "moderate" | "low" | "info";
    text: string;
  }[] = [];

  const movedToHigh = attentionStudents.filter(
    (s) =>
      (s.risk === "High" || s.risk === "Severe") && s.trend === "up"
  ).length;
  const improving = attentionStudents.filter((s) => s.trend === "down").length;
  const risingStress = assessed.filter(
    (r) =>
      (r.stress_score != null && r.stress_score > 26) &&
      riskTrend(r) === "up"
  ).length;
  const risingWorkload = assessed.filter(
    (r) =>
      r.academic_workload != null &&
      r.academic_workload >= 7 &&
      riskTrend(r) === "up"
  ).length;

  if (movedToHigh > 0) {
    recentChanges.push({
      tone: "high",
      text: `${movedToHigh} student${movedToHigh === 1 ? "" : "s"} moved toward High Risk`,
    });
  }
  if (risingStress > 0) {
    recentChanges.push({
      tone: "high",
      text: `${risingStress} student${risingStress === 1 ? "" : "s"} showed increasing stress`,
    });
  }
  if (risingWorkload > 0) {
    recentChanges.push({
      tone: "moderate",
      text: `${risingWorkload} student${risingWorkload === 1 ? "" : "s"} showed increasing workload`,
    });
  }
  if (improving > 0) {
    recentChanges.push({
      tone: "low",
      text: `${improving} student${improving === 1 ? "" : "s"} improved in risk trend`,
    });
  }
  if (
    latestTrend &&
    previousTrend &&
    (latestTrend.highCount ?? 0) < (previousTrend.highCount ?? 0)
  ) {
    const delta =
      (previousTrend.highCount ?? 0) - (latestTrend.highCount ?? 0);
    recentChanges.push({
      tone: "low",
      text: `${delta} fewer High Risk student${delta === 1 ? "" : "s"} vs last week`,
    });
  }
  if (earlyWarningCount > 0) {
    recentChanges.push({
      tone: "moderate",
      text: `${earlyWarningCount} student${earlyWarningCount === 1 ? "" : "s"} flagged by AI early warning (${nextWeekHighCount} next-week High)`,
    });
  }
  const genderSummary = buildGenderRiskSummary(rows);
  if (genderSummary.mostProneNote) {
    recentChanges.push({
      tone: "high",
      text: genderSummary.mostProneNote,
    });
  }
  for (const note of genderSummary.variableNotes.slice(0, 3)) {
    if (note === genderSummary.mostProneNote) continue;
    recentChanges.push({
      tone: "moderate",
      text: note,
    });
  }
  if (!recentChanges.length) {
    recentChanges.push({
      tone: "info",
      text: "No notable risk changes in the latest monitoring window",
    });
  }

  return {
    totalStudents: rows.length,
    monitoredCount,
    assessedCount: monitoredCount,
    lowRiskCount,
    moderateRiskCount,
    highRiskCount,
    earlyWarningCount,
    nextWeekHighCount,
    week2HighCount,
    riskOverview,
    yearStats,
    riskByClass,
    classOptions,
    weeklyTrends,
    attentionStudents,
    earlyWarningStudents,
    aiProjectionStudents,
    riskFactors,
    byGender: genderSummary.byGender,
    mostProneGender: genderSummary.mostProneToHigh,
    mostProneGenderNote: genderSummary.mostProneNote,
    byGenderVariable: genderSummary.byVariable,
    genderVariableNotes: genderSummary.variableNotes,
    submittedCount,
    pendingCount,
    completionPercent,
    recentChanges: recentChanges.slice(0, 6),
  };
}


