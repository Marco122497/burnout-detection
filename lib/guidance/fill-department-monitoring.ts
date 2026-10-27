import type { createClient } from "@/lib/supabase/server";
import {
  buildBalancedRiskTargets,
  buildRiskTargetsFromPercents,
  FOLLOW_CHANGE_SD,
  generateFollowOnMonitoringAnswers,
  generateMonitoringAnswersForRisk,
  generatePersonalMonitoringAnswers,
  type AnswerStyle,
  type FollowChange,
  type PreviousWeekScores,
  type RiskPercentMix,
} from "@/lib/guidance/generate-monitoring";
import type { FillDateRange } from "@/lib/guidance/fill-week-dates";
import {
  persistGeneratedMonitoringRow,
  type PriorWeekScores,
} from "@/lib/guidance/persist-generated-monitoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPages } from "@/lib/supabase/fetch-all";
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
      /** The directly previous week with its MFBI, for follow-on answers. */
      previousWeek: PreviousWeekScores | null;
      historyMfbi: number[];
      historyLevels: string[];
    }
  >();

  for (const studentId of studentIds) {
    contexts.set(studentId, {
      priorWeek: null,
      previousWeek: null,
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
      context.previousWeek =
        Number(row.week_number) === beforeWeek - 1 && mfbi?.mfbi_score != null
          ? { ...context.priorWeek, mfbi_score: Number(mfbi.mfbi_score) }
          : null;
    }
  }

  return contexts;
}

export async function fillDepartmentMonitoring(input: {
  supabase: SupabaseClient;
  departmentId: number;
  skipExisting: boolean;
  studentIds?: string[];
  riskPercents?: RiskPercentMix;
  submittedRange?: FillDateRange;
  /** Week 1, 2, or 3. Omitted means the currently open monitoring week. */
  weekNumber?: number;
  /** Personal answers follow one feeling across every section. */
  answerStyle?: AnswerStyle;
  /** With answerStyle "follow": how far a week can move from the previous one. */
  followChange?: FollowChange;
}): Promise<
  | { ok: true; result: FillDepartmentResult }
  | { ok: false; error: string; result?: Partial<FillDepartmentResult> }
> {
  const term = await getActiveTerm(input.supabase);
  if (!term) {
    return { ok: false, error: "No active academic term is configured." };
  }

  const requestedWeek =
    input.weekNumber != null ? Math.floor(input.weekNumber) : null;
  const weekNumber =
    requestedWeek != null ? requestedWeek : getCurrentWeekNumber(term);
  if (weekNumber !== 1 && weekNumber !== 2 && weekNumber !== 3) {
    return { ok: false, error: "Choose Week 1, Week 2, or Week 3 to fill." };
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

  const allStudents = await fetchAllPages(async (from, to) =>
    admin
      .from("profiles")
      .select("id, student_number")
      .eq("role", "Student")
      .eq("is_active", true)
      .eq("department_id", input.departmentId)
      .order("last_name", { ascending: true })
      .range(from, to)
  );

  if (!allStudents.length) {
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

  if (students.length > 2000) {
    return {
      ok: false,
      error: `Too many students (${students.length}). Auto-fill up to 2000 at a time, or select a smaller group.`,
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
  const riskTargets = input.riskPercents
    ? buildRiskTargetsFromPercents(students.length, input.riskPercents)
    : buildBalancedRiskTargets(students.length);

  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const context = contexts.get(student.id) ?? {
      priorWeek: null,
      previousWeek: null,
      historyMfbi: [],
      historyLevels: [],
    };

    let answers;
    let scores;
    let followsPrevious = false;
    try {
      if (input.answerStyle === "follow" && context.previousWeek) {
        ({ answers, scores } = generateFollowOnMonitoringAnswers(
          sections,
          context.previousWeek,
          FOLLOW_CHANGE_SD[input.followChange ?? "medium"]
        ));
        followsPrevious = true;
      } else {
        // No previous week to follow: the risk mix decides this student.
        ({ answers, scores } =
          input.answerStyle === "personal" || input.answerStyle === "follow"
            ? generatePersonalMonitoringAnswers(sections, riskTargets[index])
            : generateMonitoringAnswersForRisk(sections, riskTargets[index]));
      }
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
      submittedRange: input.submittedRange,
      departmentCode: department.department_code,
      useRuleBasedPrediction: true,
      remarksNote: followsPrevious
        ? `follows week ${weekNumber - 1}, ${input.followChange ?? "medium"} change`
        : null,
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
