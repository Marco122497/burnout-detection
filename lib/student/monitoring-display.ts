import { classifyMfbiScore } from "@/lib/student/mfbi";
import {
  isLegacyDailyStudyTimeScore,
  normalizeStoredStudyTimeScore,
  STUDY_TIME_SCORE_MAX,
} from "@/lib/student/scale-options";

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function round4(value: number) {
  return Math.round(value * 10000) / 10000;
}

/** Align legacy daily study scores and MFBI study normalization for history display. */
export function reconcileMonitoringStudyDisplay<
  T extends {
    study_time: number;
    mfbi_score?: number | null;
    burnout_level?: string | null;
    normalized_stress?: number | null;
    normalized_workload?: number | null;
    normalized_study_time?: number | null;
    normalized_sleep?: number | null;
    mfbi_results?: {
      mfbi_score: number;
      burnout_level: string;
      normalized_stress: number;
      normalized_workload: number;
      normalized_study_time: number;
      normalized_sleep: number;
    } | null;
  },
>(row: T): T {
  const storedStudyNorm =
    row.normalized_study_time ?? row.mfbi_results?.normalized_study_time ?? null;

  const studyWeekly =
    normalizeStoredStudyTimeScore(row.study_time, storedStudyNorm) ??
    row.study_time;
  const normalizedStudy = round4(
    clamp01(studyWeekly / STUDY_TIME_SCORE_MAX)
  );

  const stress = row.normalized_stress ?? row.mfbi_results?.normalized_stress;
  const workload =
    row.normalized_workload ?? row.mfbi_results?.normalized_workload;
  const sleep = row.normalized_sleep ?? row.mfbi_results?.normalized_sleep;

  const legacyDaily = isLegacyDailyStudyTimeScore(
    row.study_time,
    storedStudyNorm
  );
  const studyNormDrift =
    storedStudyNorm != null &&
    Math.abs(Number(storedStudyNorm) - normalizedStudy) > 0.05;

  // Trust stored MFBI whenever study time is already on the weekly scale.
  if (!legacyDaily && !studyNormDrift) {
    return { ...row, study_time: studyWeekly };
  }

  if (!legacyDaily) {
    return { ...row, study_time: studyWeekly };
  }

  if (stress == null || workload == null || sleep == null) {
    return { ...row, study_time: studyWeekly };
  }

  const mfbiScore = round4(
    (Number(stress) + Number(workload) + normalizedStudy + Number(sleep)) / 4
  );
  const burnoutLevel = classifyMfbiScore(mfbiScore);

  const next = {
    ...row,
    study_time: studyWeekly,
    mfbi_score: mfbiScore,
    burnout_level: burnoutLevel,
    normalized_study_time: normalizedStudy,
  };

  if (row.mfbi_results) {
    next.mfbi_results = {
      ...row.mfbi_results,
      mfbi_score: mfbiScore,
      burnout_level: burnoutLevel,
      normalized_study_time: normalizedStudy,
    };
  }

  return next as T;
}
