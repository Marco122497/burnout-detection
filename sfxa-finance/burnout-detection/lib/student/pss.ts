export const PSS_SCALE = [
  { value: 0, label: "Never" },
  { value: 1, label: "Almost Never" },
  { value: 2, label: "Sometimes" },
  { value: 3, label: "Fairly Often" },
  { value: 4, label: "Very Often" },
] as const;

/** Form values are stored as 1–5; classic PSS scores are 0–4 (value - 1). */
export const PSS_FORM_OPTIONS = [
  { value: 1, classicScore: 0, label: "Never" },
  { value: 2, classicScore: 1, label: "Almost Never" },
  { value: 3, classicScore: 2, label: "Sometimes" },
  { value: 4, classicScore: 3, label: "Fairly Often" },
  { value: 5, classicScore: 4, label: "Very Often" },
] as const;

export const PSS_INTRO =
  "The Perceived Stress Scale (PSS) asks about your feelings and thoughts during the last month. In each case, indicate how often you felt or thought a certain way. Treat each question separately and answer fairly quickly — choose the option that seems like a reasonable estimate.";

export const PSS_REVERSE_ITEMS = [4, 5, 7, 8] as const;

export const PSS_SCORING_NOTES = {
  normal:
    "Normal items: the response score is used as-is (0–4).",
  reverse:
    "Reverse-scored items (4, 5, 7, and 8): 0↔4, 1↔3, 2 stays 2, 3↔1, 4↔0.",
  total:
    "Total PSS score is the sum of all 10 items after reverse scoring (range 0–40). Higher scores mean higher perceived stress.",
  levels:
    "0–13 Low stress · 14–26 Moderate stress · 27–40 High perceived stress",
} as const;

/** PSS-10 items. Indices 4,5,7,8 (1-based) are reverse-scored. */
export const PSS_QUESTIONS = [
  {
    key: "q1",
    text: "In the last month, how often have you been upset because of something that happened unexpectedly?",
    reverse: false,
  },
  {
    key: "q2",
    text: "In the last month, how often have you felt that you were unable to control the important things in your life?",
    reverse: false,
  },
  {
    key: "q3",
    text: "In the last month, how often have you felt nervous and stressed?",
    reverse: false,
  },
  {
    key: "q4",
    text: "In the last month, how often have you felt confident about your ability to handle your personal problems?",
    reverse: true,
  },
  {
    key: "q5",
    text: "In the last month, how often have you felt that things were going your way?",
    reverse: true,
  },
  {
    key: "q6",
    text: "In the last month, how often have you found that you could not cope with all the things that you had to do?",
    reverse: false,
  },
  {
    key: "q7",
    text: "In the last month, how often have you been able to control irritations in your life?",
    reverse: true,
  },
  {
    key: "q8",
    text: "In the last month, how often have you felt that you were on top of things?",
    reverse: true,
  },
  {
    key: "q9",
    text: "In the last month, how often have you been angered because of things that happened that were outside of your control?",
    reverse: false,
  },
  {
    key: "q10",
    text: "In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?",
    reverse: false,
  },
] as const;

export type PssAnswers = Record<(typeof PSS_QUESTIONS)[number]["key"], number>;

export type StressLevel = "Low" | "Moderate" | "High";

export function scorePss(answers: PssAnswers): {
  stress_score: number;
  stress_level: StressLevel;
} {
  let total = 0;

  for (const question of PSS_QUESTIONS) {
    const raw = answers[question.key];
    if (raw < 0 || raw > 4 || Number.isNaN(raw)) {
      throw new Error("Each PSS item must be scored from 0 to 4.");
    }
    total += question.reverse ? 4 - raw : raw;
  }

  const stress_level: StressLevel =
    total <= 13 ? "Low" : total <= 26 ? "Moderate" : "High";

  return { stress_score: total, stress_level };
}

export function reverseClassicScore(score: number) {
  return 4 - score;
}
