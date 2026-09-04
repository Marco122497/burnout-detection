import { classifyTrendDirection } from "@/lib/student/burnout-trends";
import { computeMfbi } from "@/lib/student/mfbi";
import { predictBurnoutRiskWithAi } from "@/lib/student/predict";
import type { AnswerMap, SectionScores } from "@/lib/student/scoring";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export type PriorWeekScores = {
  stress_score: number;
  academic_workload_score: number;
  study_time_score: number;
  sleep_hours_score: number;
};

/**
 * Random submission time for the currently open monitoring week.
 *
 * Monitoring weeks are guidance-opened counters (not calendar offsets from
 * term.start_date). Use a rolling 7-day window ending at `now` so fill-week
 * dates stay in the present week and never exceed the current day/time.
 */
export function randomSubmittedAtWithinOpenWeek(now = new Date()): string {
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const earliestMs = weekStart.getTime();
  const latestMs = now.getTime();

  if (latestMs <= earliestMs) {
    return now.toISOString();
  }

  const offset = Math.floor(Math.random() * (latestMs - earliestMs + 1));
  return new Date(earliestMs + offset).toISOString();
}

export async function persistGeneratedMonitoringRow(input: {
  admin: AdminClient;
  termId: number;
  studentId: string;
  weekNumber: number;
  scores: SectionScores;
  answers: AnswerMap;
  priorWeek: PriorWeekScores | null;
  historyMfbi: number[];
  historyLevels: string[];
  skipExisting: boolean;
  departmentCode?: string | null;
}) {
  const { admin, termId, studentId, weekNumber, scores, answers, skipExisting } =
    input;

  const submittedAt = randomSubmittedAtWithinOpenWeek();

  const { data: existing } = await admin
    .from("weekly_monitoring")
    .select("monitoring_id")
    .eq("student_id", studentId)
    .eq("term_id", termId)
    .eq("week_number", weekNumber)
    .maybeSingle();

  if (existing) {
    if (skipExisting) {
      return { status: "skipped" as const };
    }

    const { error: deleteError } = await admin
      .from("weekly_monitoring")
      .delete()
      .eq("monitoring_id", existing.monitoring_id);

    if (deleteError) {
      return { status: "failed" as const, error: deleteError.message };
    }
  }

  const { data: monitoring, error: monitoringError } = await admin
    .from("weekly_monitoring")
    .insert({
      student_id: studentId,
      term_id: termId,
      week_number: weekNumber,
      stress_score: scores.stress_score,
      academic_workload_score: scores.academic_workload_score,
      study_time_score: scores.study_time_score,
      sleep_hours_score: scores.sleep_hours_score,
      status: "Submitted",
      submitted_at: submittedAt,
      remarks: `Generated week ${weekNumber} monitoring (Guidance${input.departmentCode ? ` · ${input.departmentCode}` : ""})`,
    })
    .select("monitoring_id")
    .single();

  if (monitoringError || !monitoring) {
    return {
      status: "failed" as const,
      error: monitoringError?.message ?? "Failed to save monitoring row.",
    };
  }

  const answerRows = Object.entries(answers).map(([questionId, answer_value]) => ({
    monitoring_id: monitoring.monitoring_id,
    question_id: Number(questionId),
    answer_value,
  }));

  if (answerRows.length > 0) {
    const { error: answersError } = await admin
      .from("weekly_monitoring_answers")
      .insert(answerRows);

    if (answersError) {
      await admin
        .from("weekly_monitoring")
        .delete()
        .eq("monitoring_id", monitoring.monitoring_id);
      return { status: "failed" as const, error: answersError.message };
    }
  }

  const mfbi = computeMfbi({
    stressScore: scores.stress_score,
    academicWorkload: scores.academic_workload_score,
    studyTime: scores.study_time_score,
    sleepRisk: scores.sleep_hours_score,
  });

  const { data: mfbiRow, error: mfbiError } = await admin
    .from("mfbi_results")
    .insert({
      monitoring_id: monitoring.monitoring_id,
      ...mfbi,
      remarks: `Generated week ${weekNumber} questionnaire responses`,
    })
    .select("mfbi_id, mfbi_score, burnout_risk_level")
    .single();

  if (mfbiError || !mfbiRow) {
    await admin
      .from("weekly_monitoring")
      .delete()
      .eq("monitoring_id", monitoring.monitoring_id);
    return {
      status: "failed" as const,
      error: mfbiError?.message ?? "Failed to save MFBI.",
    };
  }

  const prediction = await predictBurnoutRiskWithAi(mfbi, scores, {
    studentId: input.studentId,
    priorWeek: input.priorWeek,
    historyLevels: [...input.historyLevels, mfbi.burnout_risk_level],
    historyMfbi: [...input.historyMfbi, Number(mfbiRow.mfbi_score)],
  });
  const { error: predictionError } = await admin.from("ml_predictions").insert({
    mfbi_id: mfbiRow.mfbi_id,
    ...prediction,
    prediction_date: submittedAt,
  });

  if (predictionError) {
    return { status: "failed" as const, error: predictionError.message };
  }

  const previousMfbiScore =
    input.historyMfbi.length > 0
      ? input.historyMfbi[input.historyMfbi.length - 1]
      : null;
  const mfbiScore = Number(mfbiRow.mfbi_score);
  const direction = classifyTrendDirection(mfbiScore, previousMfbiScore);
  const mfbi_delta =
    previousMfbiScore == null
      ? null
      : Math.round((mfbiScore - previousMfbiScore) * 10000) / 10000;

  await admin.from("burnout_trends").upsert(
    {
      student_id: studentId,
      term_id: termId,
      week_number: weekNumber,
      monitoring_id: monitoring.monitoring_id,
      mfbi_score: mfbiScore,
      risk_level: mfbiRow.burnout_risk_level,
      previous_mfbi_score: previousMfbiScore,
      mfbi_delta,
      trend_direction: direction,
    },
    { onConflict: "student_id,term_id,week_number" }
  );

  return { status: "created" as const };
}
