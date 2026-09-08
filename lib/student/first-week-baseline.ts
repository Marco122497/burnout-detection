import type { BurnoutLevel } from "@/lib/student/mfbi";
import { STUDY_TIME_SCORE_MAX } from "@/lib/student/scale-options";

export type BaselinePriorScores = {
  stress_score: number;
  academic_workload_score: number;
  study_time_score: number;
  sleep_hours_score: number;
};

/**
 * Synthetic prior used when a student has no earlier monitoring week.
 * Mid-scale section scores → MFBI 0.50 (Moderate).
 */
export const FIRST_WEEK_BASELINE_MFBI = 0.5;
export const FIRST_WEEK_BASELINE_LEVEL: BurnoutLevel = "Moderate";
export const FIRST_WEEK_BASELINE_PRIOR: BaselinePriorScores = {
  stress_score: 20, // 20/40 → 0.5
  academic_workload_score: 5, // 5/10 → 0.5
  study_time_score: STUDY_TIME_SCORE_MAX / 2, // → 0.5
  sleep_hours_score: 50, // 50/100 → 0.5
};
