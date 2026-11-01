import { sexLabel, type Sex } from "@/lib/auth/roles";
import { classifyMfbiScore, resolveMfbiBurnoutLevel } from "@/lib/student/mfbi";
import { STUDY_TIME_SCORE_MAX } from "@/lib/student/scale-options";

/** Report labels for students with a recorded gender. */
export const GENDER_GROUPS = [
  "Male",
  "Female",
  "Other Gender Identities",
] as const;

export type GenderGroup = (typeof GENDER_GROUPS)[number];

export type GenderLabel = GenderGroup | "Unspecified";

const GENDER_LABELS: readonly GenderLabel[] = [...GENDER_GROUPS, "Unspecified"];

export type GenderRiskStats = {
  label: GenderLabel;
  total: number;
  classified: number;
  low: number;
  moderate: number;
  high: number;
  highRate: number;
  averageMfbi: number | null;
};

export type GenderVariableKey =
  | "burnout"
  | "stress"
  | "workload"
  | "studyTime"
  | "sleep";

export type GenderVariableGenderStats = {
  label: GenderLabel;
  classified: number;
  low: number;
  moderate: number;
  high: number;
  highRate: number;
  average: number | null;
};

export type GenderVariableStats = {
  key: GenderVariableKey;
  label: string;
  byGender: GenderVariableGenderStats[];
  /** Gender with the highest High count; null when tied or none. */
  mostHighCountGender: GenderGroup | null;
  mostHighCount: number;
  note: string | null;
};

export type GenderRiskSummary = {
  byGender: GenderRiskStats[];
  mostProneToHigh: GenderGroup | null;
  mostProneNote: string | null;
  byVariable: GenderVariableStats[];
  variableNotes: string[];
};

type GenderRiskRow = {
  sex?: Sex | null;
  mfbi_score: number | null;
  burnout_level: string | null;
  stress_score?: number | null;
  stress_level?: string | null;
  academic_workload?: number | null;
  study_time?: number | null;
  sleep_hours?: number | null;
};

const VARIABLE_DEFS: {
  key: GenderVariableKey;
  label: string;
  level: (row: GenderRiskRow) => "Low" | "Moderate" | "High" | null;
  score: (row: GenderRiskRow) => number | null;
}[] = [
  {
    key: "burnout",
    label: "Burnout (MFBI)",
    level: (row) => {
      const level = resolveMfbiBurnoutLevel(row.mfbi_score, row.burnout_level);
      if (!level) return null;
      return level === "Severe" ? "High" : level;
    },
    score: (row) => row.mfbi_score,
  },
  {
    key: "stress",
    label: "Stress Level",
    level: (row) => {
      if (
        row.stress_level === "Low" ||
        row.stress_level === "Moderate" ||
        row.stress_level === "High"
      ) {
        return row.stress_level;
      }
      if (row.stress_score == null) return null;
      const score = Number(row.stress_score);
      if (Number.isNaN(score)) return null;
      if (score <= 13) return "Low";
      if (score <= 26) return "Moderate";
      return "High";
    },
    score: (row) =>
      row.stress_score != null && !Number.isNaN(Number(row.stress_score))
        ? Number(row.stress_score)
        : null,
  },
  {
    key: "workload",
    label: "Academic Workload",
    level: (row) => {
      if (row.academic_workload == null) return null;
      const normalized = Number(row.academic_workload) / 10;
      if (Number.isNaN(normalized)) return null;
      const level = classifyMfbiScore(normalized);
      return level === "Severe" ? "High" : level;
    },
    score: (row) =>
      row.academic_workload != null &&
      !Number.isNaN(Number(row.academic_workload))
        ? Number(row.academic_workload)
        : null,
  },
  {
    key: "studyTime",
    label: "Study Time",
    level: (row) => {
      if (row.study_time == null) return null;
      const normalized = Number(row.study_time) / STUDY_TIME_SCORE_MAX;
      if (Number.isNaN(normalized)) return null;
      const level = classifyMfbiScore(normalized);
      return level === "Severe" ? "High" : level;
    },
    score: (row) =>
      row.study_time != null && !Number.isNaN(Number(row.study_time))
        ? Number(row.study_time)
        : null,
  },
  {
    key: "sleep",
    label: "Sleep Hours",
    level: (row) => {
      if (row.sleep_hours == null) return null;
      const normalized = Number(row.sleep_hours) / 100;
      if (Number.isNaN(normalized)) return null;
      const level = classifyMfbiScore(normalized);
      return level === "Severe" ? "High" : level;
    },
    score: (row) =>
      row.sleep_hours != null && !Number.isNaN(Number(row.sleep_hours))
        ? Number(row.sleep_hours)
        : null,
  },
];

function genderLabel(sex: Sex | null | undefined): GenderLabel {
  return (sexLabel(sex) as GenderGroup | null) ?? "Unspecified";
}

function joinNames(names: string[]) {
  if (names.length <= 1) return names.join("");
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/** Pick the recorded gender with the largest value; null when tied. */
function pickLeader<T extends { label: GenderLabel; classified: number }>(
  byGender: T[],
  value: (item: T) => number,
  format: (amount: number) => string,
  describe: { most: string; same: string; only: string }
): { leader: GenderGroup | null; amount: number; note: string | null } {
  const groups = byGender.filter(
    (item): item is T & { label: GenderGroup } =>
      item.label !== "Unspecified" && item.classified > 0
  );
  const best = Math.max(0, ...groups.map(value));
  if (groups.length === 0 || best <= 0) {
    return { leader: null, amount: 0, note: null };
  }

  const leaders = groups.filter((item) => value(item) === best);
  const others = groups.filter((item) => value(item) !== best);
  const othersText = others.length
    ? `, compared with ${joinNames(
        others.map((item) => `${item.label} (${format(value(item))})`)
      )}`
    : "";

  if (leaders.length > 1) {
    return {
      leader: null,
      amount: best,
      note: `${joinNames(leaders.map((item) => item.label))} students have the same ${describe.same} (${format(best)})${othersText}.`,
    };
  }

  const leader = leaders[0].label;
  return {
    leader,
    amount: best,
    note:
      groups.length === 1
        ? `${leader} students account for the ${describe.only} (${format(best)}).`
        : `${leader} students have the ${describe.most} (${format(best)})${othersText}.`,
  };
}

function emptyGenderRecord<T>(make: () => T): Record<GenderLabel, T> {
  return Object.fromEntries(
    GENDER_LABELS.map((label) => [label, make()])
  ) as Record<GenderLabel, T>;
}

function emptyLevelBucket() {
  return {
    classified: 0,
    low: 0,
    moderate: 0,
    high: 0,
    scores: [] as number[],
  };
}

function emptyGenderTotals(label: GenderLabel) {
  return {
    label,
    total: 0,
    ...emptyLevelBucket(),
  };
}

function pickMostHighCount(byGender: GenderVariableGenderStats[]): {
  mostHighCountGender: GenderGroup | null;
  mostHighCount: number;
  note: string | null;
} {
  const pick = pickLeader(byGender, (item) => item.high, String, {
    most: "most High cases",
    same: "High count",
    only: "High cases",
  });
  return {
    mostHighCountGender: pick.leader,
    mostHighCount: pick.amount,
    note: pick.note,
  };
}

/** Aggregate Low/Moderate/High by gender for burnout and factor scores. */
export function buildGenderRiskSummary(rows: GenderRiskRow[]): GenderRiskSummary {
  const totals = Object.fromEntries(
    GENDER_LABELS.map((label) => [label, emptyGenderTotals(label)])
  ) as Record<GenderLabel, ReturnType<typeof emptyGenderTotals>>;

  const variableBuckets: Record<
    GenderVariableKey,
    Record<GenderLabel, ReturnType<typeof emptyLevelBucket>>
  > = {
    burnout: emptyGenderRecord(emptyLevelBucket),
    stress: emptyGenderRecord(emptyLevelBucket),
    workload: emptyGenderRecord(emptyLevelBucket),
    studyTime: emptyGenderRecord(emptyLevelBucket),
    sleep: emptyGenderRecord(emptyLevelBucket),
  };

  for (const row of rows) {
    const label = genderLabel(row.sex);
    totals[label].total += 1;

    for (const variable of VARIABLE_DEFS) {
      const level = variable.level(row);
      if (!level) continue;
      const bucket = variableBuckets[variable.key][label];
      bucket.classified += 1;
      if (level === "Low") bucket.low += 1;
      else if (level === "Moderate") bucket.moderate += 1;
      else bucket.high += 1;
      const score = variable.score(row);
      if (score != null) bucket.scores.push(score);
    }

    // Keep burnout totals on byGender for existing report cards.
    const burnoutLevel = VARIABLE_DEFS[0].level(row);
    if (!burnoutLevel) continue;
    const entry = totals[label];
    entry.classified += 1;
    if (row.mfbi_score != null) entry.scores.push(row.mfbi_score);
    if (burnoutLevel === "Low") entry.low += 1;
    else if (burnoutLevel === "Moderate") entry.moderate += 1;
    else entry.high += 1;
  }

  const byGender: GenderRiskStats[] = GENDER_LABELS
    .map((label) => {
      const entry = totals[label];
      const highRate =
        entry.classified > 0
          ? Math.round((entry.high / entry.classified) * 1000) / 10
          : 0;
      const averageMfbi = entry.scores.length
        ? entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
        : null;
      return {
        label,
        total: entry.total,
        classified: entry.classified,
        low: entry.low,
        moderate: entry.moderate,
        high: entry.high,
        highRate,
        averageMfbi,
      };
    })
    .filter(
      (item) =>
        item.label !== "Unspecified" || item.total > 0 || item.classified > 0
    );

  const byVariable: GenderVariableStats[] = VARIABLE_DEFS.map((variable) => {
    const byGenderForVariable: GenderVariableGenderStats[] = GENDER_LABELS
      .map((label) => {
        const entry = variableBuckets[variable.key][label];
        const highRate =
          entry.classified > 0
            ? Math.round((entry.high / entry.classified) * 1000) / 10
            : 0;
        const average = entry.scores.length
          ? entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
          : null;
        return {
          label,
          classified: entry.classified,
          low: entry.low,
          moderate: entry.moderate,
          high: entry.high,
          highRate,
          average,
        };
      })
      .filter((item) => item.label !== "Unspecified" || item.classified > 0);

    const pick = pickMostHighCount(byGenderForVariable);
    const note = pick.note
      ? `${variable.label}: ${pick.note}`
      : null;

    return {
      key: variable.key,
      label: variable.label,
      byGender: byGenderForVariable,
      mostHighCountGender: pick.mostHighCountGender,
      mostHighCount: pick.mostHighCount,
      note,
    };
  }).filter((item) => item.byGender.some((entry) => entry.classified > 0));

  let mostProneToHigh: GenderGroup | null = null;
  let mostProneNote: string | null = null;

  const burnoutVariable = byVariable.find((item) => item.key === "burnout");
  if (burnoutVariable?.note) {
    mostProneToHigh = burnoutVariable.mostHighCountGender;
    mostProneNote = burnoutVariable.note;
  } else {
    const pick = pickLeader(byGender, (item) => item.highRate, (rate) => `${rate}%`, {
      most: "highest High-risk rate",
      same: "High-risk rate",
      only: "High-risk rate",
    });
    mostProneToHigh = pick.leader;
    mostProneNote = pick.note;
  }

  const variableNotes = byVariable
    .map((item) => item.note)
    .filter((note): note is string => Boolean(note));

  return {
    byGender,
    mostProneToHigh,
    mostProneNote,
    byVariable,
    variableNotes,
  };
}

export function genderRiskTableRows(summary: GenderRiskSummary): string[][] {
  return summary.byGender.map((item) => [
    item.label,
    String(item.total),
    String(item.classified),
    String(item.low),
    String(item.moderate),
    String(item.high),
    item.classified > 0 ? `${item.highRate}%` : "—",
    item.averageMfbi != null ? item.averageMfbi.toFixed(2) : "—",
  ]);
}

export function genderVariableHighlightRows(
  summary: GenderRiskSummary
): string[][] {
  return summary.byVariable.map((variable) => [
    variable.label,
    variable.mostHighCountGender ?? "Tied / —",
    String(variable.mostHighCount),
    variable.note ?? "Compare High counts across genders",
  ]);
}

export function genderVariableSectionGroups(summary: GenderRiskSummary) {
  return summary.byVariable.map((variable) => ({
    title: `${variable.label}${
      variable.mostHighCountGender
        ? ` — most High: ${variable.mostHighCountGender}`
        : ""
    }`,
    rows: variable.byGender.map((item) => [
      item.label,
      String(item.classified),
      String(item.low),
      String(item.moderate),
      String(item.high),
      item.classified > 0 ? `${item.highRate}%` : "—",
    ]),
  }));
}

export const GENDER_RISK_COLUMNS = [
  { key: "gender", label: "Gender" },
  { key: "students", label: "Students", align: "right" as const },
  { key: "classified", label: "With risk data", align: "right" as const },
  { key: "low", label: "Low", align: "right" as const },
  { key: "moderate", label: "Moderate", align: "right" as const },
  { key: "high", label: "High", align: "right" as const },
  { key: "highRate", label: "High-risk rate", align: "right" as const },
  { key: "avgMfbi", label: "Avg MFBI", align: "right" as const },
];

export const GENDER_VARIABLE_COLUMNS = [
  { key: "gender", label: "Gender" },
  { key: "classified", label: "With data", align: "right" as const },
  { key: "low", label: "Low", align: "right" as const },
  { key: "moderate", label: "Moderate", align: "right" as const },
  { key: "high", label: "High", align: "right" as const },
  { key: "highRate", label: "High rate", align: "right" as const },
];

export const GENDER_HIGHLIGHT_COLUMNS = [
  { key: "variable", label: "Variable" },
  { key: "most", label: "Most High count" },
  { key: "count", label: "High count", align: "right" as const },
  { key: "notes", label: "Notes" },
];

export const GENDER_RISK_CSV_HEADER = [
  "Gender",
  "Students",
  "With risk data",
  "Low",
  "Moderate",
  "High",
  "High-risk rate",
  "Avg MFBI",
];
