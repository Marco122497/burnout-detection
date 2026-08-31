import type { QuestionnaireSection } from "@/lib/student/questionnaires";
import type { BurnoutLevel } from "@/lib/student/mfbi";
import { computeMfbi } from "@/lib/student/mfbi";
import { predictBurnoutRisk } from "@/lib/student/predict";
import type { AnswerMap, SectionScores } from "@/lib/student/scoring";
import { computeSectionScores } from "@/lib/student/scoring";
import {
  resolveScaleOptions,
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

/** Random valid answers for every required question, scored like a student submit. */
export function generateRandomMonitoringAnswers(
  sections: QuestionnaireSection[]
): { answers: AnswerMap; scores: SectionScores } {
  const answers = generateUniformAnswers(sections);
  const scores = computeSectionScores(sections, answers);
  return { answers, scores };
}
