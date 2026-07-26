export type BurnoutLevel = "Low" | "Moderate" | "High" | "Severe";

export type MfbiInput = {
  stressScore: number;
  academicWorkload: number;
  studyTime: number;
  sleepHours: number;
};

export type MfbiResult = {
  normalized_stress: number;
  normalized_academic_workload: number;
  normalized_study_time: number;
  normalized_sleep_hours: number;
  mfbi_score: number;
  burnout_risk_level: BurnoutLevel;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function round4(value: number) {
  return Math.round(value * 10000) / 10000;
}

/**
 * Classify MFBI score using:
 * 0.00–0.39 Low · 0.40–0.69 Moderate · 0.70–1.00 High
 *
 * "Severe" remains in the type for legacy stored rows only.
 */
export function classifyMfbiScore(score: number): BurnoutLevel {
  if (score <= 0.39) return "Low";
  if (score <= 0.69) return "Moderate";
  return "High";
}

/**
 * MFBI = (SL_n + AW_n + ST_n + SH_n) / 4
 *
 * Normalization (0–1):
 * - Stress (PSS-10): 0–40
 * - Academic workload: 0–10
 * - Study time: 0–12 hours/day
 * - Sleep: inverted vs 8h ideal → (8 - hours) / 8
 */
export function computeMfbi(input: MfbiInput): MfbiResult {
  const normalized_stress = clamp01(input.stressScore / 40);
  const normalized_academic_workload = clamp01(input.academicWorkload / 10);
  const normalized_study_time = clamp01(input.studyTime / 12);
  const normalized_sleep_hours = clamp01((8 - input.sleepHours) / 8);

  const mfbi_score = round4(
    (normalized_stress +
      normalized_academic_workload +
      normalized_study_time +
      normalized_sleep_hours) /
      4
  );

  return {
    normalized_stress: round4(normalized_stress),
    normalized_academic_workload: round4(normalized_academic_workload),
    normalized_study_time: round4(normalized_study_time),
    normalized_sleep_hours: round4(normalized_sleep_hours),
    mfbi_score,
    burnout_risk_level: classifyMfbiScore(mfbi_score),
  };
}
