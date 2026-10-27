"use server";

import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
import { requireRole } from "@/lib/auth/session";
import {
  predictSubmittedCurrentWeek,
  type CurrentWeekPredictionRun,
} from "@/lib/student/predict-current-week";

export type MonitoringPredictionState = {
  error?: string;
  success?: string;
};

export async function predictCurrentWeekMonitoring(
  _prev: MonitoringPredictionState,
  _formData: FormData
): Promise<MonitoringPredictionState> {
  const { supabase, user } = await requireRole(["Guidance Counselor"]);
  if (!isSuperadminEmail(user.email)) {
    return {
      error: "Only superadmin@school.edu can run predictions for this week.",
    };
  }

  try {
    const weeks = [1, 2, 3].filter(
      (week) => _formData.get(`predict_week_${week}`) === "1"
    );
    if (weeks.length === 0) {
      return { error: "Choose Week 1, Week 2, Week 3, or a combination." };
    }

    const runs: CurrentWeekPredictionRun[] = [];
    for (const week of weeks) {
      const result = await predictSubmittedCurrentWeek(supabase, {
        weekNumber: week,
      });
      if (result.offline) {
        return {
          error: `The AI is offline, so week ${result.week ?? week} predictions were not saved.`,
        };
      }
      runs.push(result);
    }

    return summarizePredictionRuns(runs);
  } catch (error) {
    console.error("predictCurrentWeekMonitoring:", error);
    return { error: "Could not run predictions for this week." };
  }
}

function summarizePredictionRuns(
  runs: CurrentWeekPredictionRun[]
): MonitoringPredictionState {
  const withSubmissions = runs.filter((run) => run.submitted > 0);
  if (withSubmissions.length === 0) {
    const labels = runs.map((run) => run.week ?? "?").join(" or ");
    return { error: `No students have submitted week ${labels} yet.` };
  }

  // Do not revalidatePath here. This action runs on /guidance/monitoring,
  // and revalidating that route makes the action response re-render the
  // whole page. That response hangs and the browser throws "Failed to fetch".
  // The predict button calls router.refresh() after a successful return.

  const parts = withSubmissions.map((result) => {
    if (result.updated === 0 && result.failed === 0) {
      return `Week ${result.week}: all ${result.skipped} submitted record${result.skipped === 1 ? "" : "s"} already have a next-week forecast.`;
    }
    const piece = [
      `Week ${result.week}: predicted ${result.updated} submitted record${result.updated === 1 ? "" : "s"}.`,
    ];
    if (result.skipped > 0) {
      piece.push(`${result.skipped} already had a next-week forecast.`);
    }
    if (result.failed > 0) {
      piece.push(`${result.failed} could not be predicted.`);
    }
    return piece.join(" ");
  });

  const emptyWeeks = runs.filter((run) => run.submitted === 0 && run.week != null);
  for (const run of emptyWeeks) {
    parts.push(`Week ${run.week}: no submissions.`);
  }

  return { success: parts.join(" ") };
}
