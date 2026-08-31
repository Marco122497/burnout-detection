import type { QuestionRow, QuestionnaireKey } from "@/lib/student/questionnaires";

export type ScaleOption = {
  value: number;
  label: string;
  /** Optional MFBI numeric mapping (weekly study hours for ST1). */
  numeric_value?: number | null;
};

const PSS_DEFAULTS: ScaleOption[] = [
  { value: 1, label: "Never" },
  { value: 2, label: "Almost Never" },
  { value: 3, label: "Sometimes" },
  { value: 4, label: "Fairly Often" },
  { value: 5, label: "Very Often" },
];

const WORKLOAD_DEFAULTS: ScaleOption[] = [
  { value: 1, label: "Definitely Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Definitely Agree" },
];

const SLEEP_DEFAULTS: ScaleOption[] = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

/** ST1 — weekly study hours (order 1, primary MFBI item). */
const ST1_WEEKLY_LIKERT_DEFAULTS: ScaleOption[] = [
  { value: 1, label: "Less than 5 hours", numeric_value: 2.5 },
  { value: 2, label: "5–10 hours", numeric_value: 7.5 },
  { value: 3, label: "11–15 hours", numeric_value: 13 },
  { value: 4, label: "16–20 hours", numeric_value: 18 },
  { value: 5, label: "More than 20 hours", numeric_value: 25 },
];

/** ST2 — review frequency (order 2+; averaged with ST1 for MFBI). */
const ST2_FREQUENCY_DEFAULTS: ScaleOption[] = [
  { value: 1, label: "Never" },
  { value: 2, label: "Sometimes" },
  { value: 3, label: "Often" },
  { value: 4, label: "Very Often" },
];

const STUDY_TIME_LIKERT_DEFAULTS: ScaleOption[] = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

/** Max weekly study hours for MFBI normalization (matches ST1 score 5). */
export const STUDY_TIME_SCORE_MAX = 25;

/**
 * Maps ST1 weekly-hour Likert (1–5) to estimated hours/week for MFBI (÷ 25).
 */
export const STUDY_WEEKLY_HOURS_MAP: Record<number, number> = {
  1: 2.5,
  2: 7.5,
  3: 13,
  4: 18,
  5: 25,
};

/** @deprecated Use STUDY_WEEKLY_HOURS_MAP */
export const STUDY_LIKERT_HOURS_MAP = STUDY_WEEKLY_HOURS_MAP;

const GENERIC_LIKERT_DEFAULTS: ScaleOption[] = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

const YES_NO_DEFAULTS: ScaleOption[] = [
  { value: 1, label: "No" },
  { value: 2, label: "Yes" },
];

/** Legacy rows stored daily hours (≤ 6) before weekly scoring. */
export function normalizeStoredStudyTimeScore(
  value: number | null | undefined
): number | null {
  if (value == null || Number.isNaN(Number(value))) return null;
  const score = Number(value);
  if (score <= 6) {
    return Math.round(score * 7 * 100) / 100;
  }
  return Math.round(score * 100) / 100;
}

export function isLegacyDailyStudyTimeScore(value: number | null | undefined) {
  return value != null && Number(value) <= 6;
}

export function cloneScaleOptions(options: readonly ScaleOption[]): ScaleOption[] {
  return options.map((option) => ({ ...option }));
}

export function getStudyQuestionRole(question: Pick<QuestionRow, "question_text" | "question_order">) {
  if (/how often/i.test(question.question_text)) return "supporting";
  if (question.question_order === 1) return "primary";
  if (question.question_order === 2) return "supporting";
  return "supporting";
}

function isWeeklyHoursScale(options: ScaleOption[]) {
  return options.some((option) => /\bhours?\b/i.test(option.label));
}

export function isStudyWeeklyHoursQuestion(
  sectionKey: QuestionnaireKey,
  question: QuestionRow,
  questionnaireName?: string | null
) {
  if (sectionKey !== "study") return false;
  if (getStudyQuestionRole(question) === "primary") return true;
  return isWeeklyHoursScale(
    resolveScaleOptions(sectionKey, question, questionnaireName)
  );
}

/**
 * Maps ST2 frequency Likert (e.g. Never → Very Often) to weekly hours equivalent
 * on the 0–{STUDY_TIME_SCORE_MAX} MFBI scale (higher frequency = higher risk).
 */
export function getStudyFrequencyHoursEquivalent(
  sectionKey: QuestionnaireKey,
  question: QuestionRow,
  answerValue: number,
  questionnaireName?: string | null
) {
  const options = resolveScaleOptions(sectionKey, question, questionnaireName);
  if (!options.length) return null;

  const min = Math.min(...options.map((option) => option.value));
  const max = Math.max(...options.map((option) => option.value));
  if (answerValue < min || answerValue > max) return null;
  if (max === min) return 0;

  return Math.round(
    ((answerValue - min) / (max - min)) * STUDY_TIME_SCORE_MAX * 100
  ) / 100;
}

export function getDefaultScaleOptions(input: {
  questionnaireName?: string | null;
  responseType?: QuestionRow["response_type"];
  questionOrder?: number;
}): ScaleOption[] {
  const name = input.questionnaireName ?? "";
  const responseType = input.responseType ?? "Likert Scale";

  if (responseType === "Yes/No") {
    return cloneScaleOptions(YES_NO_DEFAULTS);
  }

  if (/perceived stress|pss/i.test(name) && responseType === "Likert Scale") {
    return cloneScaleOptions(PSS_DEFAULTS);
  }

  if (/academic workload/i.test(name) && responseType === "Likert Scale") {
    return cloneScaleOptions(WORKLOAD_DEFAULTS);
  }

  if (/sleep/i.test(name) && responseType === "Likert Scale") {
    return cloneScaleOptions(SLEEP_DEFAULTS);
  }

  if (/study time/i.test(name) && responseType === "Likert Scale") {
    if (input.questionOrder === 1) {
      return cloneScaleOptions(ST1_WEEKLY_LIKERT_DEFAULTS);
    }
    if (input.questionOrder === 2) {
      return cloneScaleOptions(ST2_FREQUENCY_DEFAULTS);
    }
    return cloneScaleOptions(STUDY_TIME_LIKERT_DEFAULTS);
  }

  if (responseType === "Likert Scale") {
    return cloneScaleOptions(GENERIC_LIKERT_DEFAULTS);
  }

  return cloneScaleOptions(GENERIC_LIKERT_DEFAULTS);
}

export function normalizeScaleOptions(raw: unknown): ScaleOption[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const options: ScaleOption[] = [];
  const seenValues = new Set<number>();

  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const value = Number((item as ScaleOption).value);
    const label = String((item as ScaleOption).label ?? "").trim();
    const numericRaw = (item as ScaleOption).numeric_value;

    if (!Number.isInteger(value) || value < 1 || !label) return null;
    if (seenValues.has(value)) return null;
    seenValues.add(value);

    options.push({
      value,
      label,
      numeric_value:
        numericRaw == null
          ? undefined
          : Number.isFinite(Number(numericRaw))
            ? Number(numericRaw)
            : undefined,
    });
  }

  return options.length >= 2 ? options : null;
}

export function parseScaleOptionsField(raw: FormDataEntryValue | null): ScaleOption[] | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;

  try {
    return normalizeScaleOptions(JSON.parse(text));
  } catch {
    return null;
  }
}

export function serializeScaleOptions(options: ScaleOption[]): string {
  return JSON.stringify(options);
}

export function validateScaleOptions(options: ScaleOption[]): string | null {
  if (options.length < 2) {
    return "Add at least two response choices.";
  }
  if (options.length > 12) {
    return "A question can have at most 12 response choices.";
  }
  if (options.some((option) => !option.label.trim())) {
    return "Every response choice needs a label.";
  }
  return null;
}

export function resolveScaleOptions(
  sectionKey: QuestionnaireKey,
  question: QuestionRow,
  questionnaireName?: string | null
): ScaleOption[] {
  let custom = normalizeScaleOptions(question.scale_options);

  if (
    sectionKey === "study" &&
    getStudyQuestionRole(question) === "supporting" &&
    custom &&
    isWeeklyHoursScale(custom)
  ) {
    custom = null;
  }

  if (custom) return custom;

  return getDefaultScaleOptions({
    questionnaireName,
    responseType: question.response_type,
    questionOrder: question.question_order,
  });
}

export function getAnswerLabelForQuestion(
  sectionKey: QuestionnaireKey,
  question: QuestionRow,
  answerValue: number,
  questionnaireName?: string | null
) {
  return (
    resolveScaleOptions(sectionKey, question, questionnaireName).find(
      (option) => option.value === answerValue
    )?.label ?? null
  );
}

export function isValidAnswerForQuestion(
  sectionKey: QuestionnaireKey,
  question: QuestionRow,
  value: number,
  questionnaireName?: string | null
) {
  return resolveScaleOptions(sectionKey, question, questionnaireName).some(
    (option) => option.value === value
  );
}

export function supportsCustomScaleOptions(
  responseType: QuestionRow["response_type"]
) {
  return (
    responseType === "Likert Scale" ||
    responseType === "Hours" ||
    responseType === "Number"
  );
}

function toWeeklyStudyHours(numericValue: number) {
  // Legacy configs stored daily estimates (≤ 6 hrs/day) before weekly scoring.
  if (numericValue > 0 && numericValue <= 6) {
    return numericValue * 7;
  }
  return numericValue;
}

export function getNumericValueForAnswer(
  sectionKey: QuestionnaireKey,
  question: QuestionRow,
  answerValue: number,
  questionnaireName?: string | null
) {
  const option = resolveScaleOptions(sectionKey, question, questionnaireName).find(
    (item) => item.value === answerValue
  );
  if (!option) return null;

  const isPrimaryStudy =
    sectionKey === "study" && getStudyQuestionRole(question) === "primary";

  if (option.numeric_value != null && Number.isFinite(option.numeric_value)) {
    return isPrimaryStudy
      ? toWeeklyStudyHours(option.numeric_value)
      : option.numeric_value;
  }

  if (isPrimaryStudy && STUDY_WEEKLY_HOURS_MAP[answerValue] != null) {
    return STUDY_WEEKLY_HOURS_MAP[answerValue];
  }

  return answerValue;
}
