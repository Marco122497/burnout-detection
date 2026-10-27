import type { QuestionnaireSection } from "@/lib/student/questionnaires";
import type { BurnoutLevel } from "@/lib/student/mfbi";
import { computeMfbi } from "@/lib/student/mfbi";
import { predictBurnoutRisk } from "@/lib/student/predict";
import type { AnswerMap, SectionScores } from "@/lib/student/scoring";
import { computeSectionScores } from "@/lib/student/scoring";
import {
  resolveScaleOptions,
  STUDY_TIME_SCORE_MAX,
  type ScaleOption,
} from "@/lib/student/scale-options";

export type TargetRiskLevel = "Low" | "Moderate" | "High";

type RiskBias = "low" | "mid" | "high";

const NEGATIVE_SLEEP_WORDING =
  /difficulty|trouble|lack of sleep|could not sleep|couldn't sleep/i;

const MFBI_CENTER: Record<TargetRiskLevel, number> = {
  Low: 0.2,
  Moderate: 0.55,
  High: 0.85,
};

/** Evenly distribute Low / Moderate / High, then shuffle. */
export function buildBalancedRiskTargets(count: number): TargetRiskLevel[] {
  const levels: TargetRiskLevel[] = ["Low", "Moderate", "High"];
  const targets: TargetRiskLevel[] = [];

  for (let index = 0; index < count; index += 1) {
    targets.push(levels[index % levels.length]);
  }

  for (let index = targets.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [targets[index], targets[swapIndex]] = [targets[swapIndex], targets[index]];
  }

  return targets;
}

export type RiskPercentMix = {
  low: number;
  moderate: number;
  high: number;
};

/** Distribute targets by Low / Moderate / High percentages, then shuffle. */
export function buildRiskTargetsFromPercents(
  count: number,
  percents: RiskPercentMix
): TargetRiskLevel[] {
  if (count <= 0) return [];

  const low = Math.max(0, Number(percents.low) || 0);
  const moderate = Math.max(0, Number(percents.moderate) || 0);
  const high = Math.max(0, Number(percents.high) || 0);
  const sum = low + moderate + high;

  if (sum <= 0) {
    return buildBalancedRiskTargets(count);
  }

  const weights: Array<{ level: TargetRiskLevel; share: number }> = [
    { level: "Low", share: (count * low) / sum },
    { level: "Moderate", share: (count * moderate) / sum },
    { level: "High", share: (count * high) / sum },
  ];

  const floors = weights.map((item) => ({
    level: item.level,
    count: Math.floor(item.share),
    frac: item.share - Math.floor(item.share),
  }));

  let remaining = count - floors.reduce((total, item) => total + item.count, 0);
  const byFrac = [...floors].sort((a, b) => b.frac - a.frac);
  for (const item of byFrac) {
    if (remaining <= 0) break;
    item.count += 1;
    remaining -= 1;
  }

  const targets: TargetRiskLevel[] = [];
  for (const item of floors) {
    for (let i = 0; i < item.count; i += 1) {
      targets.push(item.level);
    }
  }

  for (let index = targets.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [targets[index], targets[swapIndex]] = [targets[swapIndex], targets[index]];
  }

  return targets;
}

function biasForTarget(target: TargetRiskLevel): RiskBias {
  if (target === "Low") return "low";
  if (target === "High") return "high";
  return "mid";
}

function pickBiasedValue(
  options: ScaleOption[],
  bias: RiskBias,
  invertRisk: boolean
): number {
  const sorted = [...options].sort((a, b) => a.value - b.value);
  const count = sorted.length;
  if (count === 0) {
    throw new Error("Question has no scale options.");
  }
  if (count === 1) return sorted[0].value;

  let effectiveBias = bias;
  if (invertRisk) {
    effectiveBias =
      bias === "low" ? "high" : bias === "high" ? "low" : "mid";
  }

  let index: number;
  if (effectiveBias === "low") {
    index = Math.floor(Math.random() * Math.max(1, Math.ceil(count * 0.45)));
  } else if (effectiveBias === "high") {
    index =
      count -
      1 -
      Math.floor(Math.random() * Math.max(1, Math.ceil(count * 0.45)));
  } else {
    const lower = Math.floor(count * 0.2);
    const upper = Math.max(lower + 1, Math.ceil(count * 0.8));
    index = lower + Math.floor(Math.random() * (upper - lower));
  }

  return sorted[Math.min(Math.max(index, 0), count - 1)].value;
}

function invertRiskForQuestion(
  sectionKey: QuestionnaireSection["key"],
  question: QuestionnaireSection["questions"][number]
) {
  if (sectionKey === "pss" && question.reverse_scored) {
    return true;
  }

  if (sectionKey === "sleep") {
    const isNegative =
      question.reverse_scored ||
      NEGATIVE_SLEEP_WORDING.test(question.question_text);
    return !isNegative;
  }

  return false;
}

function generateBiasedAnswers(
  sections: QuestionnaireSection[],
  bias: RiskBias
): AnswerMap {
  const answers: AnswerMap = {};

  for (const section of sections) {
    for (const question of section.questions) {
      if (!question.is_required) continue;

      const options = resolveScaleOptions(
        section.key,
        question,
        section.questionnaire_name
      );
      if (!options.length) continue;

      answers[question.question_id] = pickBiasedValue(
        options,
        bias,
        invertRiskForQuestion(section.key, question)
      );
    }
  }

  return answers;
}

function generateUniformAnswers(sections: QuestionnaireSection[]): AnswerMap {
  const answers: AnswerMap = {};

  for (const section of sections) {
    for (const question of section.questions) {
      if (!question.is_required) continue;

      const options = resolveScaleOptions(
        section.key,
        question,
        section.questionnaire_name
      );
      if (!options.length) continue;

      const pick = options[Math.floor(Math.random() * options.length)];
      answers[question.question_id] = pick.value;
    }
  }

  return answers;
}

function predictionMatchesTarget(
  prediction: BurnoutLevel,
  target: TargetRiskLevel
) {
  if (target === "High") {
    return prediction === "High" || prediction === "Severe";
  }
  return prediction === target;
}

function scoreCandidate(
  sections: QuestionnaireSection[],
  answers: AnswerMap,
  target: TargetRiskLevel
) {
  const scores = computeSectionScores(sections, answers);
  const mfbi = computeMfbi({
    stressScore: scores.stress_score,
    academicWorkload: scores.academic_workload_score,
    studyTime: scores.study_time_score,
    sleepRisk: scores.sleep_hours_score,
  });
  const prediction = predictBurnoutRisk(mfbi, scores);
  const mfbiDistance = Math.abs(mfbi.mfbi_score - MFBI_CENTER[target]);
  const predictionPenalty = predictionMatchesTarget(
    prediction.final_prediction,
    target
  )
    ? 0
    : 1;

  return {
    answers,
    scores,
    mfbiScore: mfbi.mfbi_score,
    mfbiDistance,
    predictionPenalty,
    matches: predictionPenalty === 0,
  };
}

/** Generate answers biased toward a target burnout risk level. */
export function generateMonitoringAnswersForRisk(
  sections: QuestionnaireSection[],
  targetRisk: TargetRiskLevel
): { answers: AnswerMap; scores: SectionScores } {
  const primaryBias = biasForTarget(targetRisk);
  const retryBiases: RiskBias[] = [primaryBias, "mid", primaryBias === "low" ? "high" : "low"];

  let best:
    | {
        answers: AnswerMap;
        scores: SectionScores;
        rank: number;
      }
    | null = null;

  for (const bias of retryBiases) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const candidate = scoreCandidate(
        sections,
        generateBiasedAnswers(sections, bias),
        targetRisk
      );

      if (candidate.matches) {
        return { answers: candidate.answers, scores: candidate.scores };
      }

      const rank = candidate.predictionPenalty * 10 + candidate.mfbiDistance;
      if (!best || rank < best.rank) {
        best = {
          answers: candidate.answers,
          scores: candidate.scores,
          rank,
        };
      }
    }
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = scoreCandidate(
      sections,
      generateUniformAnswers(sections),
      targetRisk
    );

    if (candidate.matches) {
      return { answers: candidate.answers, scores: candidate.scores };
    }

    const rank = candidate.predictionPenalty * 10 + candidate.mfbiDistance;
    if (!best || rank < best.rank) {
      best = {
        answers: candidate.answers,
        scores: candidate.scores,
        rank,
      };
    }
  }

  if (best) {
    return { answers: best.answers, scores: best.scores };
  }

  const answers = generateUniformAnswers(sections);
  return { answers, scores: computeSectionScores(sections, answers) };
}

export type AnswerStyle = "random" | "personal" | "follow";

export type FollowChange = "small" | "medium" | "large";

/** Standard deviation of the week-to-week MFBI shift for each change size. */
export const FOLLOW_CHANGE_SD: Record<FollowChange, number> = {
  small: 0.05,
  medium: 0.1,
  large: 0.15,
};

export type PreviousWeekScores = {
  stress_score: number;
  academic_workload_score: number;
  study_time_score: number;
  sleep_hours_score: number;
  mfbi_score: number;
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * One feeling for the whole form. Strain is how heavy the week feels.
 * Study follows that feeling: a heavier week means more time spent trying to keep up.
 */
function feelingForTarget(target: TargetRiskLevel) {
  const wobble = (Math.random() - 0.5) * 0.08;
  if (target === "Low") {
    return { strain: clamp01(0.16 + wobble), study: clamp01(0.38 + wobble) };
  }
  if (target === "High") {
    return { strain: clamp01(0.88 + wobble), study: clamp01(0.78 + wobble) };
  }
  return { strain: clamp01(0.52 + wobble), study: clamp01(0.55 + wobble) };
}

function pickFromFeeling(options: ScaleOption[], position: number) {
  const sorted = [...options].sort((a, b) => a.value - b.value);
  const count = sorted.length;
  if (count === 0) {
    throw new Error("Question has no scale options.");
  }
  if (count === 1) return sorted[0].value;

  const exact = clamp01(position) * (count - 1);
  const wobble = Math.random() < 0.62 ? 0 : Math.random() < 0.5 ? -1 : 1;
  const index = Math.round(exact) + wobble;
  return sorted[Math.min(Math.max(index, 0), count - 1)].value;
}

function answersFromFeeling(
  sections: QuestionnaireSection[],
  feeling: { strain: number; study: number }
): AnswerMap {
  return answersFromPositions(sections, (key) =>
    key === "study" ? feeling.study : feeling.strain
  );
}

/** One answer position (0 = lowest risk, 1 = highest) per questionnaire section. */
function answersFromPositions(
  sections: QuestionnaireSection[],
  positionFor: (key: QuestionnaireSection["key"]) => number
): AnswerMap {
  const answers: AnswerMap = {};

  for (const section of sections) {
    for (const question of section.questions) {
      if (!question.is_required) continue;

      const options = resolveScaleOptions(
        section.key,
        question,
        section.questionnaire_name
      );
      if (!options.length) continue;

      const base = positionFor(section.key);
      const invert =
        invertRiskForQuestion(section.key, question) ||
        ((section.key === "workload" || section.key === "study") &&
          question.reverse_scored);
      answers[question.question_id] = pickFromFeeling(
        options,
        invert ? 1 - base : base
      );
    }
  }

  return answers;
}

/**
 * Answer the way one student would: the same week’s feeling drives PSS,
 * workload, study time, and sleep, with only a small difference between items.
 */
export function generatePersonalMonitoringAnswers(
  sections: QuestionnaireSection[],
  targetRisk: TargetRiskLevel
): { answers: AnswerMap; scores: SectionScores } {
  const feeling = feelingForTarget(targetRisk);
  let best:
    | {
        answers: AnswerMap;
        scores: SectionScores;
        rank: number;
      }
    | null = null;

  for (let attempt = 0; attempt < 28; attempt += 1) {
    const candidate = scoreCandidate(
      sections,
      answersFromFeeling(sections, feeling),
      targetRisk
    );

    if (candidate.matches) {
      return { answers: candidate.answers, scores: candidate.scores };
    }

    const rank = candidate.predictionPenalty * 10 + candidate.mfbiDistance;
    if (!best || rank < best.rank) {
      best = {
        answers: candidate.answers,
        scores: candidate.scores,
        rank,
      };
    }

    const gap = MFBI_CENTER[targetRisk] - candidate.mfbiScore;
    const step = Math.sign(gap || (targetRisk === "Low" ? -1 : 1)) * 0.06;
    feeling.strain = clamp01(feeling.strain + step);
    feeling.study = clamp01(feeling.study + step * 0.5);
  }

  if (best) {
    return { answers: best.answers, scores: best.scores };
  }

  return generateMonitoringAnswersForRisk(sections, targetRisk);
}

function gaussian() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

type FactorKey = "pss" | "workload" | "study" | "sleep";

const FACTOR_KEYS: FactorKey[] = ["pss", "workload", "study", "sleep"];

/** Each factor on its 0–1 MFBI scale. */
function factorLevels(scores: {
  stress_score: number;
  academic_workload_score: number;
  study_time_score: number;
  sleep_hours_score: number;
}): Record<FactorKey, number> {
  return {
    pss: clamp01(scores.stress_score / 40),
    workload: clamp01(scores.academic_workload_score / 10),
    study: clamp01(scores.study_time_score / STUDY_TIME_SCORE_MAX),
    sleep: clamp01(scores.sleep_hours_score / 100),
  };
}

/**
 * Answers that continue the student's previous week factor by factor. Stress,
 * workload, study time, and sleep each start from last week's level and move
 * by one shared shift plus a smaller shift of their own (`changeSd` sets both).
 */
export function generateFollowOnMonitoringAnswers(
  sections: QuestionnaireSection[],
  previous: PreviousWeekScores,
  changeSd: number
): { answers: AnswerMap; scores: SectionScores; targetMfbi: number } {
  const lastWeek = factorLevels(previous);
  const sharedShift = gaussian() * changeSd;
  const targets = Object.fromEntries(
    FACTOR_KEYS.map((key) => [
      key,
      clamp01(lastWeek[key] + sharedShift + gaussian() * changeSd * 0.5),
    ])
  ) as Record<FactorKey, number>;
  const targetMfbi =
    FACTOR_KEYS.reduce((sum, key) => sum + targets[key], 0) / FACTOR_KEYS.length;

  const positions = { ...targets };
  let best: { answers: AnswerMap; scores: SectionScores; error: number } | null =
    null;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const answers = answersFromPositions(
      sections,
      (key) => positions[key as FactorKey] ?? 0.5
    );
    const scores = computeSectionScores(sections, answers);
    const levels = factorLevels(scores);
    const gaps = FACTOR_KEYS.map((key) => targets[key] - levels[key]);
    const error = gaps.reduce((sum, gap) => sum + Math.abs(gap), 0);
    if (!best || error < best.error) {
      best = { answers, scores, error };
    }
    if (gaps.every((gap) => Math.abs(gap) <= 0.03)) break;
    FACTOR_KEYS.forEach((key, index) => {
      positions[key] = clamp01(positions[key] + gaps[index] * 0.8);
    });
  }

  return { answers: best!.answers, scores: best!.scores, targetMfbi };
}

/** Random valid answers for every required question, scored like a student submit. */
export function generateRandomMonitoringAnswers(
  sections: QuestionnaireSection[]
): { answers: AnswerMap; scores: SectionScores } {
  const answers = generateUniformAnswers(sections);
  const scores = computeSectionScores(sections, answers);
  return { answers, scores };
}
