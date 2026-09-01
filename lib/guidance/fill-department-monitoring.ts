import type { createClient } from "@/lib/supabase/server";
import {
  buildBalancedRiskTargets,
  generateMonitoringAnswersForRisk,
} from "@/lib/guidance/generate-monitoring";
import {
  persistGeneratedMonitoringRow,
  type PriorWeekScores,
} from "@/lib/guidance/persist-generated-monitoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWeeklyMonitoringSections } from "@/lib/student/questionnaires";
import { getActiveTerm, getCurrentWeekNumber } from "@/lib/student/terms";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type FillDepartmentResult = {
  weekNumber: number;
  departmentName: string;
  created: number;
  skipped: number;
  failures: string[];
};

async function loadDepartmentWeekContexts(
  admin: ReturnType<typeof createAdminClient>,
  studentIds: string[],
  termId: number,
  beforeWeek: number
) {
  const contexts = new Map<
    string,
    {
      priorWeek: PriorWeekScores | null;
      historyMfbi: number[];
      historyLevels: string[];
    }
  >();

  for (const studentId of studentIds) {
    contexts.set(studentId, {
      priorWeek: null,
      historyMfbi: [],
      historyLevels: [],
    });
  }

  const chunkSize = 100;
  for (let index = 0; index < studentIds.length; index += chunkSize) {
    const chunk = studentIds.slice(index, index + chunkSize);
    const { data: rows } = await admin
      .from("weekly_monitoring")
      .select(
        "student_id, week_number, stress_score, academic_workload_score, study_time_score, sleep_hours_score, mfbi_results(mfbi_score, burnout_risk_level)"
      )
      .eq("term_id", termId)
      .in("student_id", chunk)
      .lt("week_number", beforeWeek)
      .order("week_number", { ascending: true });

    for (const row of rows ?? []) {
      const context = contexts.get(row.student_id);
      if (!context) continue;

      const mfbiRaw = row.mfbi_results;
      const mfbi = Array.isArray(mfbiRaw) ? mfbiRaw[0] : mfbiRaw;
      if (mfbi?.mfbi_score != null) {
        context.historyMfbi.push(Number(mfbi.mfbi_score));
      }
      if (mfbi?.burnout_risk_level) {
        context.historyLevels.push(String(mfbi.burnout_risk_level));
      }

      context.priorWeek = {
        stress_score: Number(row.stress_score),
        academic_workload_score: Number(row.academic_workload_score),
        study_time_score: Number(row.study_time_score),
        sleep_hours_score: Number(row.sleep_hours_score),
      };
    }
  }

  return contexts;
}

export async function fillDepartmentMonitoring(input: {
  supabase: SupabaseClient;
  departmentId: number;
  skipExisting: boolean;
  studentIds?: string[];
}): Promise<
  | { ok: true; result: FillDepartmentResult }
  | { ok: false; error: string; result?: Partial<FillDepartmentResult> }
> {
  const term = await getActiveTerm(input.supabase);
  if (!term) {
    return { ok: false, error: "No active academic term is configured." };
  }

  const weekNumber = getCurrentWeekNumber(term);
  if (weekNumber < 1) {
    return { ok: false, error: "Current monitoring week is not set." };
  }

  const sections = await getWeeklyMonitoringSections(input.supabase);
  if (sections.some((section) => section.questions.length === 0)) {
    return {
      ok: false,
      error:
        "Weekly monitoring questionnaires are not configured. Activate PSS, Workload, Study Time, and Sleep questions first.",
    };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      ok: false,
      error:
        "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local to auto-fill monitoring.",
    };
  }

  const { data: department } = await admin
    .from("departments")
    .select("department_id, department_name, department_code")
    .eq("department_id", input.departmentId)
    .maybeSingle();

  if (!department) {
    return { ok: false, error: "Department not found." };
  }

  const { data: allStudents } = await admin
    .from("profiles")
    .select("id, student_number")
    .eq("role", "Student")
    .eq("is_active", true)
    .eq("department_id", input.departmentId);

  if (!allStudents?.length) {
    return {
      ok: false,
      error: `No active students in ${department.department_name ?? "this department"}.`,
    };
  }

  let students = allStudents;
  if (input.studentIds?.length) {
    const allowed = new Set(input.studentIds);
    students = allStudents.filter((student) => allowed.has(student.id));
  }

  if (!students.length) {
    return { ok: false, error: "Select at least one student to fill." };
  }

  if (students.length > 500) {
    return {
      ok: false,
      error: `Too many students (${students.length}). Auto-fill up to 500 at a time.`,
    };
  }

  const studentIds = students.map((student) => student.id);
  const contexts = await loadDepartmentWeekContexts(
    admin,
    studentIds,
    term.term_id,
    weekNumber
  );

  let created = 0;
  let skipped = 0;
  const failures: string[] = [];
  const riskTargets = buildBalancedRiskTargets(students.length);

  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const context = contexts.get(student.id) ?? {
      priorWeek: null,
      historyMfbi: [],
      historyLevels: [],
    };

    let answers;
    let scores;
    try {
      ({ answers, scores } = generateMonitoringAnswersForRisk(
        sections,
        riskTargets[index]
      ));
    } catch (error) {
      failures.push(
        `${student.student_number ?? student.id}: ${
          error instanceof Error ? error.message : "Could not build answers."
        }`
      );
      continue;
    }

    const result = await persistGeneratedMonitoringRow({
      admin,
      termId: term.term_id,
      studentId: student.id,
      weekNumber,
      scores,
      answers,
      priorWeek: context.priorWeek,
      historyMfbi: context.historyMfbi,
      historyLevels: context.historyLevels,
      skipExisting: input.skipExisting,
      departmentCode: department.department_code,
    });

    if (result.status === "created") {
      created += 1;
    } else if (result.status === "skipped") {
      skipped += 1;
    } else {
      failures.push(
        `${student.student_number ?? student.id}: ${result.error}`
      );
    }
  }

  const result: FillDepartmentResult = {
    weekNumber,
    departmentName: department.department_name,
    created,
    skipped,
    failures,
  };

  if (created === 0 && skipped > 0 && failures.length === 0) {
    return {
      ok: false,
      error: `All ${skipped} student(s) already submitted week ${weekNumber}. Uncheck "Skip existing" to replace their responses.`,
      result,
    };
  }

  if (created === 0 && skipped === 0) {
    return {
      ok: false,
      error: failures[0] ?? "No monitoring rows were generated.",
      result,
    };
  }

  return { ok: true, result };
}
