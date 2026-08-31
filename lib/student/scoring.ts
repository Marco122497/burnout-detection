import type {
  QuestionRow,
  QuestionnaireKey,
  QuestionnaireSection,
} from "@/lib/student/questionnaires";
import {
  getNumericValueForAnswer,
  getStudyFrequencyHoursEquivalent,
  getStudyQuestionRole,
  isStudyWeeklyHoursQuestion,
  isValidAnswerForQuestion,
  STUDY_TIME_SCORE_MAX,
} from "@/lib/student/scale-options";

export type AnswerMap = Record<number, number>;

export type SectionScores = {
  stress_score: number;
  stress_level: "Low" | "Moderate" | "High";
  academic_workload_score: number;
  study_time_score: number;
  /** Sleep Risk Score 0–100 (higher = poorer sleep). Stored as sleep_hours_score. */
  sleep_hours_score: number;
};

function requireAnswer(
  sectionKey: QuestionnaireKey,
  question: QuestionRow,
  answers: AnswerMap,
  questionnaireName?: string | null
) {
  const raw = answers[question.question_id];
  if (!isValidAnswerForQuestion(sectionKey, question, raw, questionnaireName)) {
    return false;
  }
  return true;
}

/** PSS-10 with DB answers 1–5 → classic 0–40 score after reverse scoring. */
export function scorePssSection(
  questions: QuestionRow[],
  answers: AnswerMap,
  questionnaireName?: string | null
) {
  let total = 0;

  for (const question of questions) {
    const raw = answers[question.question_id];
    if (!isValidAnswerForQuestion("pss", question, raw, questionnaireName)) {
      throw new Error("Please answer every PSS question (1–5).");
    }
    const zeroToFour = raw - 1;
    total += question.reverse_scored ? 4 - zeroToFour : zeroToFour;
  }

  const stress_level: SectionScores["stress_level"] =
    total <= 13 ? "Low" : total <= 26 ? "Moderate" : "High";

  return { stress_score: total, stress_level };
}

/** Average Likert (1–5) scaled to 0–10 workload score. */
export function scoreWorkloadSection(
  questions: QuestionRow[],
  answers: AnswerMap,
  questionnaireName?: string | null
) {
  if (!questions.length) throw new Error("Academic Workload questions missing.");

  let sum = 0;
  for (const question of questions) {
    const raw = answers[question.question_id];
    if (!isValidAnswerForQuestion("workload", question, raw, questionnaireName)) {
      throw new Error("Please answer every Academic Workload question.");
    }
    sum += raw;
  }

  const average = sum / questions.length;
  return Math.round(((average - 1) / 4) * 10 * 100) / 100;
}

/**
 * Study time score as estimated hours/week (0–{STUDY_TIME_SCORE_MAX}).
 * Averages ST1 weekly hours with ST2 review frequency (mapped to the same scale).
 */
export function scoreStudySection(
  questions: QuestionRow[],
  answers: AnswerMap,
  questionnaireName?: string | null
) {
  if (!questions.length) throw new Error("Study Time questions missing.");

  for (const question of questions) {
    if (!question.is_required) continue;
    if (!requireAnswer("study", question, answers, questionnaireName)) {
      throw new Error("Please answer every Study Time question.");
    }
  }

  const primary =
    questions.find((question) => getStudyQuestionRole(question) === "primary") ??
    questions.find((question) => question.question_order === 1) ??
    questions[0];

  const rawPrimary = answers[primary.question_id];
  if (!isValidAnswerForQuestion("study", primary, rawPrimary, questionnaireName)) {
    throw new Error("Please answer the primary Study Time question.");
  }

  const primaryHours = getNumericValueForAnswer(
    "study",
    primary,
    rawPrimary,
    questionnaireName
  );
  if (primaryHours == null || !Number.isFinite(primaryHours)) {
    throw new Error("Study Time score could not be calculated.");
  }

  const componentScores: number[] = [primaryHours];

  for (const question of questions) {
    if (question.question_id === primary.question_id) continue;
    if (getStudyQuestionRole(question) !== "supporting") continue;

    const raw = answers[question.question_id];
    if (!isValidAnswerForQuestion("study", question, raw, questionnaireName)) {
      continue;
    }

    if (isStudyWeeklyHoursQuestion("study", question, questionnaireName)) {
      continue;
    }

    const frequencyHours = getStudyFrequencyHoursEquivalent(
      "study",
      question,
      raw,
      questionnaireName
    );
    if (frequencyHours != null && Number.isFinite(frequencyHours)) {
      componentScores.push(frequencyHours);
    }
  }

  const average =
    componentScores.reduce((sum, value) => sum + value, 0) /
    componentScores.length;

  return Math.min(
    STUDY_TIME_SCORE_MAX,
    Math.round(average * 100) / 100
  );
}

/**
 * Negatively worded sleep items (agreeing = worse sleep). Used as a
 * fallback when reverse_scored is not set on the question row.
 */
const NEGATIVE_SLEEP_WORDING = /difficulty|trouble|lack of sleep|could not sleep|couldn't sleep/i;

/**
 * Sleep Risk Score (0–100). Higher always = poorer sleep / greater burnout risk.
 *
 * Likert scale: 1 = Strongly Disagree … 5 = Strongly Agree.
 *
 * 1. Positive statements (slept enough, rested, regular schedule) → scored as-is
 *    (Agree raises sleep quality).
 * 2. Negative statements (difficulty sleeping, etc.) → reverse-scored via the
 *    reverse_scored DB flag (or wording fallback) so Agree does not raise quality.
 * 3. Average quality (1–5) is inverted to risk: ((5 − avg) / 4) × 100.
 */
export function scoreSleepSection(
  questions: QuestionRow[],
  answers: AnswerMap,
  questionnaireName?: string | null
) {
  if (!questions.length) throw new Error("Sleep Hours questions missing.");

  let qualitySum = 0;
  for (const question of questions) {
    const raw = answers[question.question_id];
    if (!isValidAnswerForQuestion("sleep", question, raw, questionnaireName)) {
      throw new Error("Please answer every Sleep Hours question.");
    }

    const isNegative =
      question.reverse_scored ||
      NEGATIVE_SLEEP_WORDING.test(question.question_text);

    // Positive → keep raw; negative → flip so Agree lowers quality.
    const qualityValue = isNegative ? 6 - raw : raw;
    qualitySum += qualityValue;
  }

  const avgQuality = qualitySum / questions.length; // 1–5, higher = better sleep
  const risk = ((5 - avgQuality) / 4) * 100; // 0–100, higher = worse sleep
  return Math.round(Math.min(100, Math.max(0, risk)) * 100) / 100;
}

export function computeSectionScores(
  sections: QuestionnaireSection[],
  answers: AnswerMap
): SectionScores {
  const byKey = Object.fromEntries(
    sections.map((section) => [section.key, section])
  ) as Record<QuestionnaireKey, QuestionnaireSection | undefined>;

  if (!byKey.pss?.questions.length) {
    throw new Error("PSS questionnaire is not configured.");
  }
  if (!byKey.workload?.questions.length) {
    throw new Error("Academic Workload questionnaire is not configured.");
  }
  if (!byKey.study?.questions.length) {
    throw new Error("Study Time questionnaire is not configured.");
  }
  if (!byKey.sleep?.questions.length) {
    throw new Error("Sleep Hours questionnaire is not configured.");
  }

  const pss = scorePssSection(
    byKey.pss.questions,
    answers,
    byKey.pss.questionnaire_name
  );

  return {
    stress_score: pss.stress_score,
    stress_level: pss.stress_level,
    academic_workload_score: scoreWorkloadSection(
      byKey.workload.questions,
      answers,
      byKey.workload.questionnaire_name
    ),
    study_time_score: scoreStudySection(
      byKey.study.questions,
      answers,
      byKey.study.questionnaire_name
    ),
    sleep_hours_score: scoreSleepSection(
      byKey.sleep.questions,
      answers,
      byKey.sleep.questionnaire_name
    ),
  };
}

export function validateAllAnswers(
  sections: QuestionnaireSection[],
  answers: AnswerMap
) {
  for (const section of sections) {
    for (const question of section.questions) {
      if (!question.is_required) continue;
      if (
        !isValidAnswerForQuestion(
          section.key,
          question,
          answers[question.question_id],
          section.questionnaire_name
        )
      ) {
        return `Please answer all required questions in ${section.questionnaire_name}.`;
      }
    }
  }
  return null;
}
