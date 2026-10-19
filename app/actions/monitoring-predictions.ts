"use server";

import { revalidatePath } from "next/cache";

import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
import { requireRole } from "@/lib/auth/session";
import { predictSubmittedCurrentWeek } from "@/lib/student/predict-current-week";

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
    const result = await predictSubmittedCurrentWeek(supabase);
    if (result.week == null) {
      return { error: "No active monitoring week is open." };
    }
    if (result.submitted === 0) {
      return {
        error: `No students have submitted week ${result.week} yet.`,
      };
    }
    if (result.offline) {
      return {
        error: `The AI is offline, so week ${result.week} predictions were not saved.`,
      };
    }

    revalidatePath("/guidance/monitoring", "layout");
    revalidatePath("/guidance");
    revalidatePath("/instructor/monitoring", "layout");
    revalidatePath("/instructor");

    if (result.updated === 0 && result.failed === 0) {
      return {
        success: `Week ${result.week}: all ${result.skipped} submitted record${result.skipped === 1 ? "" : "s"} already have a next-week forecast.`,
      };
    }

    const parts = [
      `Week ${result.week}: predicted ${result.updated} submitted record${result.updated === 1 ? "" : "s"}.`,
    ];
    if (result.skipped > 0) {
      parts.push(
        `${result.skipped} already had a next-week forecast.`
      );
    }
    if (result.failed > 0) {
      parts.push(`${result.failed} could not be predicted.`);
    }
    return { success: parts.join(" ") };
  } catch (error) {
    console.error("predictCurrentWeekMonitoring:", error);
    return { error: "Could not run predictions for this week." };
  }
}
