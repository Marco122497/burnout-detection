import { STUDY_TIME_SCORE_MAX } from "@/lib/student/scale-options";

export type BurnoutLevel = "Low" | "Moderate" | "High" | "Severe";

export type MfbiInput = {
  stressScore: number;
  academicWorkload: number;
  studyTime: number;
  /** Sleep Risk Score 0–100 (higher = poorer sleep). */
  sleepRisk: number;
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

function roundMfbiScore(score: number) {
  return Math.round(score * 100) / 100;
}

/**
 * Classify MFBI score using:
 * 0.00–0.39 Low · 0.40–0.69 Moderate · 0.70–1.00 High
 *
 * Scores are rounded to 2 decimals first so display and bands stay aligned
 * (e.g. 0.695 → 0.70 High, not 0.69 Moderate).
 *
 * "Severe" remains in the type for legacy stored rows only.
 */
export function classifyMfbiScore(score: number): BurnoutLevel {
  const normalized = roundMfbiScore(score);
  if (normalized <= 0.39) return "Low";
  if (normalized <= 0.69) return "Moderate";
  return "High";
}

export function formatMfbiScore(score: number | null | undefined) {
  if (score == null) return "—";
  return roundMfbiScore(score).toFixed(2);
}

export type MfbiRiskBucket = "Low" | "Moderate" | "High";

/** MFBI-based risk bucket for dashboards and reports (ignores ML prediction). */
export function mfbiRiskBucket(
  mfbiScore: number | null | undefined,
  storedLevel?: string | null
): MfbiRiskBucket | null {
  const level = resolveMfbiBurnoutLevel(mfbiScore, storedLevel);
  if (!level) return null;
  if (level === "Severe") return "High";
  return level;
}

/** MFBI-based burnout level for display (ignores ML prediction). */
export function resolveMfbiBurnoutLevel(
  mfbiScore: number | null | undefined,
  storedLevel?: string | null
): BurnoutLevel | null {
  if (mfbiScore != null) return classifyMfbiScore(mfbiScore);
  if (
    storedLevel === "Low" ||
    storedLevel === "Moderate" ||
    storedLevel === "High" ||
    storedLevel === "Severe"
  ) {
    return storedLevel;
  }
  return null;
}

/**
 * MFBI = (SL_n + AW_n + ST_n + SH_n) / 4
 *
 * Normalization (0–1), all oriented so higher = greater burnout risk:
 * - Stress (PSS-10): 0–40
 * - Academic workload: 0–10
 * - Study time: 0–25 hours/week (average of ST1 weekly hours + ST2 frequency)
 * - Sleep risk: 0–100 (already risk-oriented; no hours inversion)
 */
export function computeMfbi(input: MfbiInput): MfbiResult {
  const normalized_stress = clamp01(input.stressScore / 40);
  const normalized_academic_workload = clamp01(input.academicWorkload / 10);
  const normalized_study_time = clamp01(input.studyTime / STUDY_TIME_SCORE_MAX);
  const normalized_sleep_hours = clamp01(input.sleepRisk / 100);

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
