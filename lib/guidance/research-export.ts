import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  QUESTIONNAIRE_KEYS,
  QUESTIONNAIRE_NAMES,
  type QuestionnaireKey,
} from "@/lib/student/questionnaires";
import {
  MODEL_EXPORT_FILES,
  researchFilename,
  type ResearchDatasetKey,
  type ResearchWeekFilter,
} from "@/lib/guidance/research-downloads";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPages } from "@/lib/supabase/fetch-all";

const BOM = "\uFEFF";
const CLASSES = ["Low", "Moderate", "High"] as const;
const COMPLETED = new Set(["Submitted", "Reviewed"]);

const FACTOR: Record<
  QuestionnaireKey,
  { code: string; name: string }
> = {
  pss: { code: "SL", name: "Stress Level" },
  workload: { code: "AW", name: "Academic Workload" },
  study: { code: "ST", name: "Study Time" },
  sleep: { code: "SH", name: "Sleep Hours" },
};

type CsvRow = (string | number | null | undefined)[];

type ProfileRow = {
  id: string;
  age: number | null;
  sex: string | null;
  course: string | null;
  year_level: number | null;
  section: string | null;
  enrollment_status: string | null;
  created_at: string | null;
};

type MonitoringRow = {
  monitoring_id: number;
  student_id: string;
  term_id: number;
  week_number: number;
  stress_score: number | string;
  academic_workload_score: number | string;
  study_time_score: number | string;
  sleep_hours_score: number | string;
  status: string | null;
  submitted_at: string | null;
};

type AnswerRow = {
  monitoring_id: number;
  question_id: number;
  answer_value: number;
};

type QuestionRow = {
  question_id: number;
  questionnaire_id: number;
  question_text: string;
  question_order: number;
  reverse_scored: boolean | null;
  is_active: boolean | null;
};

type MfbiRow = {
  monitoring_id: number;
  normalized_stress: number | string;
  normalized_academic_workload: number | string;
  normalized_study_time: number | string;
  normalized_sleep_hours: number | string;
  mfbi_score: number | string;
  burnout_risk_level: string;
};

type ClassBlock = {
  precision?: number;
  recall?: number;
  "f1-score"?: number;
  support?: number;
};

type ClassificationReport = {
  accuracy?: number;
  "macro avg"?: ClassBlock;
  "weighted avg"?: ClassBlock;
  [label: string]: ClassBlock | number | undefined;
};

type TrainedBlock = {
  accuracy?: number;
  confusion_matrix?: { labels?: string[]; matrix?: number[][] };
  classification_report?: ClassificationReport;
  feature_importance?: Record<string, number>;
};

type TrainedMetrics = {
  generated_by?: string;
  classes?: string[];
  next_week?: {
    samples?: number;
    holdout_rows?: number;
    features?: string[];
    decision_tree?: TrainedBlock;
    random_forest?: TrainedBlock;
    note?: string;
  } | null;
  notes?: { next_week?: string };
};

type ForecastPair = {
  student_id: string;
  current_week: number;
  target_week: number;
  current_sl: string;
  current_aw: string;
  current_st: string;
  current_sh: string;
  actual_current_mfbi: string;
  actual_current_category: string;
  actual_next_mfbi: string;
  actual_next_category: string;
};

type MetricCells = {
  accuracy: string;
  precision_low: string;
  recall_low: string;
  f1_low: string;
  precision_moderate: string;
  recall_moderate: string;
  f1_moderate: string;
  precision_high: string;
  recall_high: string;
  f1_high: string;
  macro_f1: string;
  weighted_f1: string;
  cohen_kappa: string;
  test_sample_count: string;
};

export type ResearchExportFile = { name: string; text: string };

function csvCell(value: string | number | null | undefined) {
  let text = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows: CsvRow[]) {
  return (
    BOM + rows.map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\r\n")
  );
}

function num(value: number | string | null | undefined) {
  if (value == null || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : "";
}

function round4(value: number) {
  if (!Number.isFinite(value)) return "";
  return String(Math.round(value * 10000) / 10000);
}

function researchWeek(value: number | string) {
  const week = Number(value);
  return Number.isInteger(week) && week >= 1 ? week : null;
}

function weekMatches(filter: ResearchWeekFilter, week: number) {
  return filter === "all" || filter === week;
}

function statusOf(status: string | null) {
  return status ?? "Submitted";
}

function isCompleted(status: string | null) {
  return COMPLETED.has(statusOf(status));
}

function monitoringStatus(status: string | null) {
  const value = statusOf(status);
  if (value === "Submitted" || value === "Reviewed") return "Completed";
  if (value === "Draft") return "Incomplete";
  return value;
}

function sexLabel(value: string | null) {
  if (!value) return "";
  if (value === "Other") return "Other Gender Identities";
  return value;
}

function sectionKeyForName(name: string): QuestionnaireKey | null {
  for (const key of QUESTIONNAIRE_KEYS) {
    if (QUESTIONNAIRE_NAMES[key] === name) return key;
  }
  return null;
}

function emptyMetrics(): MetricCells {
  return {
    accuracy: "",
    precision_low: "",
    recall_low: "",
    f1_low: "",
    precision_moderate: "",
    recall_moderate: "",
    f1_moderate: "",
    precision_high: "",
    recall_high: "",
    f1_high: "",
    macro_f1: "",
    weighted_f1: "",
    cohen_kappa: "",
    test_sample_count: "",
  };
}

function cohenKappa(matrix: number[][]) {
  const total = matrix.reduce(
    (sum, row) => sum + row.reduce((rowSum, count) => rowSum + count, 0),
    0
  );
  if (!total) return "";
  let observed = 0;
  const rowSums = matrix.map((row) => row.reduce((sum, count) => sum + count, 0));
  const columnSums = matrix[0].map((_, column) =>
    matrix.reduce((sum, row) => sum + (row[column] ?? 0), 0)
  );
  for (let index = 0; index < matrix.length; index += 1) {
    observed += matrix[index][index] ?? 0;
  }
  const po = observed / total;
  let pe = 0;
  for (let index = 0; index < matrix.length; index += 1) {
    pe += (rowSums[index] / total) * (columnSums[index] / total);
  }
  if (pe === 1) return "1";
  return round4((po - pe) / (1 - pe));
}

function scoresFromMatrix(labels: string[], matrix: number[][]) {
  const total = matrix.reduce(
    (sum, row) => sum + row.reduce((rowSum, count) => rowSum + count, 0),
    0
  );
  const perClass = labels.map((label, index) => {
    const support = matrix[index]?.reduce((sum, count) => sum + count, 0) ?? 0;
    const predicted = matrix.reduce((sum, row) => sum + (row[index] ?? 0), 0);
    const tp = matrix[index]?.[index] ?? 0;
    const precision = predicted ? tp / predicted : 0;
    const recall = support ? tp / support : 0;
    const f1 =
      precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    return { label, precision, recall, f1, support };
  });
  const correct = labels.reduce(
    (sum, _label, index) => sum + (matrix[index]?.[index] ?? 0),
    0
  );
  const macro = perClass.length
    ? perClass.reduce((sum, row) => sum + row.f1, 0) / perClass.length
    : 0;
  const weighted = total
    ? perClass.reduce((sum, row) => sum + row.f1 * row.support, 0) / total
    : 0;
  return {
    accuracy: total ? correct / total : 0,
    perClass,
    macro,
    weighted,
    total,
    kappa: cohenKappa(matrix),
  };
}

function metricsFromMatrix(labels: string[], matrix: number[][]): MetricCells {
  const scores = scoresFromMatrix(labels, matrix);
  const cell = (
    label: string,
    key: "precision" | "recall" | "f1"
  ) => {
    const found = scores.perClass.find((row) => row.label === label);
    return found ? round4(found[key]) : "";
  };
  return {
    accuracy: round4(scores.accuracy),
    precision_low: cell("Low", "precision"),
    recall_low: cell("Low", "recall"),
    f1_low: cell("Low", "f1"),
    precision_moderate: cell("Moderate", "precision"),
    recall_moderate: cell("Moderate", "recall"),
    f1_moderate: cell("Moderate", "f1"),
    precision_high: cell("High", "precision"),
    recall_high: cell("High", "recall"),
    f1_high: cell("High", "f1"),
    macro_f1: round4(scores.macro),
    weighted_f1: round4(scores.weighted),
    cohen_kappa: scores.kappa,
    test_sample_count: String(scores.total),
  };
}

function reportNumber(
  report: ClassificationReport | undefined,
  section: string,
  key: keyof ClassBlock
) {
  const block = report?.[section];
  if (!block || typeof block !== "object") return "";
  const value = Number(block[key]);
  return Number.isFinite(value) ? round4(value) : "";
}

function metricsFromModel(block: TrainedBlock | undefined): MetricCells {
  const labels = block?.confusion_matrix?.labels ?? [];
  const matrix = block?.confusion_matrix?.matrix ?? [];
  const usable =
    labels.length > 0 &&
    matrix.length === labels.length &&
    matrix.every((row) => row.length === labels.length);
  const cells = usable ? metricsFromMatrix(labels, matrix) : emptyMetrics();
  const report = block?.classification_report;
  if (!report) {
    if (block?.accuracy != null && cells.accuracy === "") {
      cells.accuracy = round4(Number(block.accuracy));
    }
    return cells;
  }
  if (typeof report.accuracy === "number") cells.accuracy = round4(report.accuracy);
  else if (block?.accuracy != null) cells.accuracy = round4(Number(block.accuracy));
  const apply = (
    label: "Low" | "Moderate" | "High",
    precision: keyof MetricCells,
    recall: keyof MetricCells,
    f1: keyof MetricCells
  ) => {
    const p = reportNumber(report, label, "precision");
    const r = reportNumber(report, label, "recall");
    const f = reportNumber(report, label, "f1-score");
    if (p) cells[precision] = p;
    if (r) cells[recall] = r;
    if (f) cells[f1] = f;
  };
  apply("Low", "precision_low", "recall_low", "f1_low");
  apply("Moderate", "precision_moderate", "recall_moderate", "f1_moderate");
  apply("High", "precision_high", "recall_high", "f1_high");
  const macro = reportNumber(report, "macro avg", "f1-score");
  const weighted = reportNumber(report, "weighted avg", "f1-score");
  if (macro) cells.macro_f1 = macro;
  if (weighted) cells.weighted_f1 = weighted;
  const weightedAvg = report["weighted avg"];
  if (
    weightedAvg &&
    typeof weightedAvg === "object" &&
    weightedAvg.support != null &&
    Number.isFinite(Number(weightedAvg.support))
  ) {
    cells.test_sample_count = String(Number(weightedAvg.support));
  }
  return cells;
}

function metricValues(cells: MetricCells) {
  return [
    cells.accuracy,
    cells.precision_low,
    cells.recall_low,
    cells.f1_low,
    cells.precision_moderate,
    cells.recall_moderate,
    cells.f1_moderate,
    cells.precision_high,
    cells.recall_high,
    cells.f1_high,
    cells.macro_f1,
    cells.weighted_f1,
    cells.cohen_kappa,
    cells.test_sample_count,
  ];
}

const METRIC_HEADER = [
  "model_name",
  "accuracy",
  "precision_low",
  "recall_low",
  "f1_low",
  "precision_moderate",
  "recall_moderate",
  "f1_moderate",
  "precision_high",
  "recall_high",
  "f1_high",
  "macro_f1",
  "weighted_f1",
  "cohen_kappa",
  "test_sample_count",
];

function confusionCsv(block: TrainedBlock | undefined) {
  const labels = block?.confusion_matrix?.labels?.length
    ? block.confusion_matrix.labels
    : [...CLASSES];
  const matrix = block?.confusion_matrix?.matrix ?? [];
  const rows: CsvRow[] = [
    ["actual_category", ...labels.map((label) => `predicted_${label}`)],
  ];
  labels.forEach((label, index) => {
    const counts = labels.map(
      (_predicted, column) => matrix[index]?.[column] ?? ""
    );
    rows.push([label, ...counts]);
  });
  return toCsv(rows);
}

function majorityMatrix(labels: string[], matrix: number[][]) {
  const rowSums = matrix.map((row) => row.reduce((sum, count) => sum + count, 0));
  let majority = 0;
  rowSums.forEach((count, index) => {
    if (count > rowSums[majority]) majority = index;
  });
  return {
    label: labels[majority] ?? "",
    matrix: rowSums.map((count) =>
      labels.map((_label, column) => (column === majority ? count : 0))
    ),
  };
}

function persistenceMatrix(pairs: ForecastPair[]) {
  const labels = [...CLASSES] as string[];
  for (const pair of pairs) {
    for (const label of [pair.actual_current_category, pair.actual_next_category]) {
      if (label && !labels.includes(label)) labels.push(label);
    }
  }
  const index = new Map(labels.map((label, position) => [label, position]));
  const matrix = labels.map(() => labels.map(() => 0));
  for (const pair of pairs) {
    const row = index.get(pair.actual_current_category);
    const column = index.get(pair.actual_next_category);
    if (row == null || column == null) continue;
    matrix[row][column] += 1;
  }
  return { labels, matrix };
}

async function readTrainedMetrics() {
  try {
    const file = path.join(process.cwd(), "burnout-ai", "models", "metrics.json");
    return JSON.parse(await readFile(file, "utf8")) as TrainedMetrics;
  } catch {
    return null;
  }
}

async function fetchOptional<T>(load: () => Promise<T[]>) {
  try {
    return await load();
  } catch (error) {
    console.error("research export optional table:", error);
    return [];
  }
}

function periodLabel(week: ResearchWeekFilter) {
  return week === "all" ? "All weeks" : `Week ${week}`;
}

export function researchExportReadme(week: ResearchWeekFilter) {
  return `${BOM}Research Data Export
Monitoring period for student files: ${periodLabel(week)}

Student identifiers in these files are research IDs such as S001.
Names, email addresses, phone numbers, and student numbers are not included.
The research ID is assigned from student-account creation order. It is not a predictive feature.

respondent_profile.csv — age, sex, program, year, section, enrollment, and whether the student completed at least one monitoring week in the selected period.
weekly_monitoring_participation.csv — one row per monitoring record. Completed means Submitted or Reviewed. is_valid is true only for those completed records.
weekly_questionnaire_responses.csv — one row per questionnaire item. response_value is the recorded answer before reverse scoring. Question codes: SL stress, AW academic workload, ST study time, SH sleep hours.
weekly_mfbi_results.csv — stored factor scores, normalized scores, MFBI, and risk category for completed records.
next_week_forecasting_dataset.csv — consecutive weeks for the same student in the same term. Week 1 to Week 2, and Week 2 to Week 3, when both weeks are completed. The selected period keeps pairs whose input week matches. Features for the primary models are current_sl, current_aw, current_st, and current_sh. actual_current_category is for the persistence baseline only.

Model files are the saved next-week hold-out from burnout-ai/models/metrics.json. They do not change with the week filter.
model_evaluation_results.csv — Decision Tree and Random Forest.
confusion_matrix_decision_tree.csv and confusion_matrix_random_forest.csv — hold-out counts.
feature_importance_random_forest.csv — influence inside the saved model, not a cause of burnout.
baseline_comparison.csv — majority-class baseline and the two models on the hold-out, plus the persistence baseline on all consecutive research pairs.
model_metadata.csv — split, seed, parameters, stored features, and model version.
student_id and the current-week category are not inputs to the primary models.

functional_testing_results.csv and usability_evaluation_results.csv contain only records stored from real tests and real evaluators. Column headers with no data rows mean those records have not been entered. This export does not invent evaluation answers.
`;
}

export async function buildResearchExport(options: {
  datasets: ResearchDatasetKey[];
  week: ResearchWeekFilter;
}): Promise<ResearchExportFile[]> {
  const { datasets, week } = options;
  const needsMonitoring = datasets.some((key) =>
    ["profile", "participation", "responses", "mfbi", "forecasting", "models"].includes(
      key
    )
  );
  const admin = createAdminClient();

  const files: ResearchExportFile[] = [];
  const nameFor = (filename: string) => researchFilename(filename, week);

  let profiles: ProfileRow[] = [];
  let monitoring: MonitoringRow[] = [];
  let questions: QuestionRow[] = [];
  let questionnaires: { questionnaire_id: number; questionnaire_name: string }[] = [];
  let answers: AnswerRow[] = [];
  let mfbiRows: MfbiRow[] = [];
  let trained: TrainedMetrics | null = null;

  if (needsMonitoring) {
    const loaded = await Promise.all([
      fetchAllPages<ProfileRow>((from, to) =>
        admin
          .from("profiles")
          .select(
            "id, age, sex, course, year_level, section, enrollment_status, created_at"
          )
          .eq("role", "Student")
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to)
      ),
      fetchAllPages<MonitoringRow>((from, to) =>
        admin
          .from("weekly_monitoring")
          .select(
            "monitoring_id, student_id, term_id, week_number, stress_score, academic_workload_score, study_time_score, sleep_hours_score, status, submitted_at"
          )
          .order("monitoring_id", { ascending: true })
          .range(from, to)
      ),
      fetchAllPages<{ questionnaire_id: number; questionnaire_name: string }>(
        (from, to) =>
          admin
            .from("questionnaires")
            .select("questionnaire_id, questionnaire_name")
            .order("questionnaire_id", { ascending: true })
            .range(from, to)
      ),
      fetchAllPages<QuestionRow>((from, to) =>
        admin
          .from("questions")
          .select(
            "question_id, questionnaire_id, question_text, question_order, reverse_scored, is_active"
          )
          .order("question_id", { ascending: true })
          .range(from, to)
      ),
      fetchAllPages<AnswerRow>((from, to) =>
        admin
          .from("weekly_monitoring_answers")
          .select("monitoring_id, question_id, answer_value")
          .order("answer_id", { ascending: true })
          .range(from, to)
      ),
      fetchAllPages<MfbiRow>((from, to) =>
        admin
          .from("mfbi_results")
          .select(
            "monitoring_id, normalized_stress, normalized_academic_workload, normalized_study_time, normalized_sleep_hours, mfbi_score, burnout_risk_level"
          )
          .order("mfbi_id", { ascending: true })
          .range(from, to)
      ),
      datasets.includes("models") ? readTrainedMetrics() : Promise.resolve(null),
    ]);
    profiles = loaded[0];
    monitoring = loaded[1];
    questionnaires = loaded[2];
    questions = loaded[3];
    answers = loaded[4];
    mfbiRows = loaded[5];
    trained = loaded[6];
  }

  const profileIds = [...profiles]
    .sort((a, b) => {
      const created = (a.created_at ?? "").localeCompare(b.created_at ?? "");
      if (created !== 0) return created;
      return a.id.localeCompare(b.id);
    })
    .map((row) => row.id);
  const knownStudents = new Set(profileIds);
  const orphans = [
    ...new Set(
      monitoring
        .map((row) => row.student_id)
        .filter((id) => !knownStudents.has(id))
    ),
  ].sort();
  const orderedIds = [...profileIds, ...orphans];
  const width = Math.max(3, String(Math.max(orderedIds.length, 1)).length);
  const respondentByStudent = new Map(
    orderedIds.map((id, index) => [
      id,
      `S${String(index + 1).padStart(width, "0")}`,
    ])
  );

  const questionnaireName = new Map(
    questionnaires.map((row) => [row.questionnaire_id, row.questionnaire_name])
  );
  const answeredIds = new Set(answers.map((row) => row.question_id));
  const exportedQuestions = questions
    .filter((question) => question.is_active || answeredIds.has(question.question_id))
    .map((question) => {
      const name = questionnaireName.get(question.questionnaire_id) ?? "";
      const sectionKey = sectionKeyForName(name);
      const factor = sectionKey ? FACTOR[sectionKey] : null;
      return {
        ...question,
        sectionKey,
        itemCode: factor
          ? `${factor.code}${question.question_order}`
          : `Q${question.question_id}`,
        factor: factor?.name ?? "Other",
      };
    })
    .sort((a, b) => {
      const aKey = a.sectionKey ? QUESTIONNAIRE_KEYS.indexOf(a.sectionKey) : 99;
      const bKey = b.sectionKey ? QUESTIONNAIRE_KEYS.indexOf(b.sectionKey) : 99;
      if (aKey !== bKey) return aKey - bKey;
      return a.question_order - b.question_order;
    });

  const mfbiByMonitoring = new Map(
    mfbiRows.map((row) => [row.monitoring_id, row])
  );
  const answersByMonitoring = new Map<number, Map<number, number>>();
  for (const answer of answers) {
    const bucket =
      answersByMonitoring.get(answer.monitoring_id) ?? new Map<number, number>();
    bucket.set(answer.question_id, answer.answer_value);
    answersByMonitoring.set(answer.monitoring_id, bucket);
  }

  const chapterRows = monitoring
    .filter((row) => researchWeek(row.week_number) != null)
    .sort((a, b) => {
      const respondent = (
        respondentByStudent.get(a.student_id) ?? ""
      ).localeCompare(respondentByStudent.get(b.student_id) ?? "");
      if (respondent !== 0) return respondent;
      const weekOrder = Number(a.week_number) - Number(b.week_number);
      if (weekOrder !== 0) return weekOrder;
      return a.monitoring_id - b.monitoring_id;
    });

  const weeksByStudentTerm = new Map<string, Map<number, MonitoringRow>>();
  for (const row of chapterRows) {
    const weekNumber = researchWeek(row.week_number);
    if (weekNumber == null) continue;
    const key = `${row.student_id}:${row.term_id}`;
    const weeks = weeksByStudentTerm.get(key) ?? new Map<number, MonitoringRow>();
    weeks.set(weekNumber, row);
    weeksByStudentTerm.set(key, weeks);
  }

  const allPairs: ForecastPair[] = [];
  for (const [key, weeks] of weeksByStudentTerm) {
    const studentId = key.slice(0, key.lastIndexOf(":"));
    const weekNumbers = [...weeks.keys()].sort((a, b) => a - b);
    for (let index = 0; index < weekNumbers.length - 1; index += 1) {
      const currentWeek = weekNumbers[index];
      const targetWeek = weekNumbers[index + 1];
      if (targetWeek !== currentWeek + 1) continue;
      const current = weeks.get(currentWeek);
      const next = weeks.get(targetWeek);
      if (!current || !next) continue;
      if (!isCompleted(current.status) || !isCompleted(next.status)) continue;
      const currentMfbi = mfbiByMonitoring.get(current.monitoring_id);
      const nextMfbi = mfbiByMonitoring.get(next.monitoring_id);
      if (!currentMfbi || !nextMfbi) continue;
      allPairs.push({
        student_id: respondentByStudent.get(studentId) ?? "",
        current_week: currentWeek,
        target_week: targetWeek,
        current_sl: num(current.stress_score),
        current_aw: num(current.academic_workload_score),
        current_st: num(current.study_time_score),
        current_sh: num(current.sleep_hours_score),
        actual_current_mfbi: num(currentMfbi.mfbi_score),
        actual_current_category: currentMfbi.burnout_risk_level,
        actual_next_mfbi: num(nextMfbi.mfbi_score),
        actual_next_category: nextMfbi.burnout_risk_level,
      });
    }
  }
  allPairs.sort((a, b) => {
    const student = a.student_id.localeCompare(b.student_id);
    if (student !== 0) return student;
    return a.current_week - b.current_week;
  });

  if (datasets.includes("profile")) {
    const participated = new Set<string>();
    for (const row of chapterRows) {
      const weekNumber = researchWeek(row.week_number);
      if (weekNumber == null || !weekMatches(week, weekNumber)) continue;
      if (!isCompleted(row.status)) continue;
      participated.add(row.student_id);
    }
    const rows: CsvRow[] = [
      [
        "student_id",
        "age",
        "sex",
        "program",
        "year_level",
        "section",
        "participation_status",
        "enrolled_status",
      ],
    ];
    for (const profile of [...profiles].sort((a, b) =>
      (respondentByStudent.get(a.id) ?? "").localeCompare(
        respondentByStudent.get(b.id) ?? ""
      )
    )) {
      rows.push([
        respondentByStudent.get(profile.id) ?? "",
        profile.age ?? "",
        sexLabel(profile.sex),
        profile.course ?? "",
        profile.year_level ?? "",
        profile.section ?? "",
        participated.has(profile.id) ? "Participated" : "Did not participate",
        profile.enrollment_status ?? "",
      ]);
    }
    files.push({ name: nameFor("respondent_profile.csv"), text: toCsv(rows) });
  }

  if (datasets.includes("participation")) {
    const rows: CsvRow[] = [
      [
        "student_id",
        "week_number",
        "monitoring_id",
        "submitted_at",
        "monitoring_status",
        "is_valid",
      ],
    ];
    for (const row of chapterRows) {
      const weekNumber = researchWeek(row.week_number);
      if (weekNumber == null || !weekMatches(week, weekNumber)) continue;
      rows.push([
        respondentByStudent.get(row.student_id) ?? "",
        weekNumber,
        row.monitoring_id,
        row.submitted_at ?? "",
        monitoringStatus(row.status),
        isCompleted(row.status) ? "true" : "false",
      ]);
    }
    files.push({
      name: nameFor("weekly_monitoring_participation.csv"),
      text: toCsv(rows),
    });
  }

  if (datasets.includes("responses")) {
    const rows: CsvRow[] = [
      [
        "student_id",
        "monitoring_id",
        "week_number",
        "question_id",
        "question_code",
        "factor",
        "response_value",
        "submitted_at",
      ],
    ];
    for (const row of chapterRows) {
      const weekNumber = researchWeek(row.week_number);
      if (weekNumber == null || !weekMatches(week, weekNumber)) continue;
      const answerMap = answersByMonitoring.get(row.monitoring_id);
      const hasAnswers = (answerMap?.size ?? 0) > 0;
      if (!isCompleted(row.status) && !hasAnswers) continue;
      for (const question of exportedQuestions) {
        const value = answerMap?.get(question.question_id);
        rows.push([
          respondentByStudent.get(row.student_id) ?? "",
          row.monitoring_id,
          weekNumber,
          question.question_id,
          question.itemCode,
          question.factor,
          value == null ? "" : value,
          row.submitted_at ?? "",
        ]);
      }
    }
    files.push({
      name: nameFor("weekly_questionnaire_responses.csv"),
      text: toCsv(rows),
    });
  }

  if (datasets.includes("mfbi")) {
    const rows: CsvRow[] = [
      [
        "student_id",
        "monitoring_id",
        "week_number",
        "stress_level_score",
        "academic_workload_score",
        "study_time_score",
        "sleep_hours_score",
        "normalized_sl",
        "normalized_aw",
        "normalized_st",
        "normalized_sh",
        "mfbi_score",
        "risk_category",
      ],
    ];
    for (const row of chapterRows) {
      const weekNumber = researchWeek(row.week_number);
      if (weekNumber == null || !weekMatches(week, weekNumber)) continue;
      if (!isCompleted(row.status)) continue;
      const mfbi = mfbiByMonitoring.get(row.monitoring_id);
      rows.push([
        respondentByStudent.get(row.student_id) ?? "",
        row.monitoring_id,
        weekNumber,
        num(row.stress_score),
        num(row.academic_workload_score),
        num(row.study_time_score),
        num(row.sleep_hours_score),
        mfbi ? num(mfbi.normalized_stress) : "",
        mfbi ? num(mfbi.normalized_academic_workload) : "",
        mfbi ? num(mfbi.normalized_study_time) : "",
        mfbi ? num(mfbi.normalized_sleep_hours) : "",
        mfbi ? num(mfbi.mfbi_score) : "",
        mfbi?.burnout_risk_level ?? "",
      ]);
    }
    files.push({ name: nameFor("weekly_mfbi_results.csv"), text: toCsv(rows) });
  }

  if (datasets.includes("forecasting")) {
    const pairs =
      week === "all"
        ? allPairs
        : allPairs.filter((pair) => pair.current_week === week);
    const rows: CsvRow[] = [
      [
        "student_id",
        "current_week",
        "target_week",
        "current_sl",
        "current_aw",
        "current_st",
        "current_sh",
        "actual_current_mfbi",
        "actual_current_category",
        "actual_next_mfbi",
        "actual_next_category",
      ],
    ];
    for (const pair of pairs) {
      rows.push([
        pair.student_id,
        pair.current_week,
        pair.target_week,
        pair.current_sl,
        pair.current_aw,
        pair.current_st,
        pair.current_sh,
        pair.actual_current_mfbi,
        pair.actual_current_category,
        pair.actual_next_mfbi,
        pair.actual_next_category,
      ]);
    }
    files.push({
      name: nameFor("next_week_forecasting_dataset.csv"),
      text: toCsv(rows),
    });
  }

  if (datasets.includes("models")) {
    const next = trained?.next_week ?? null;
    const decisionTree = next?.decision_tree;
    const randomForest = next?.random_forest;
    const evaluation: CsvRow[] = [METRIC_HEADER];
    for (const [modelName, block] of [
      ["Decision Tree", decisionTree],
      ["Random Forest", randomForest],
    ] as const) {
      evaluation.push([modelName, ...metricValues(metricsFromModel(block))]);
    }

    const holdoutBlock = randomForest?.confusion_matrix?.matrix?.length
      ? randomForest
      : decisionTree;
    const holdoutLabels = holdoutBlock?.confusion_matrix?.labels ?? [...CLASSES];
    const holdoutMatrix = holdoutBlock?.confusion_matrix?.matrix ?? [];
    const holdoutReady =
      holdoutMatrix.length === holdoutLabels.length &&
      holdoutMatrix.every((row) => row.length === holdoutLabels.length) &&
      holdoutMatrix.some((row) => row.some((count) => count > 0));

    const baseline: CsvRow[] = [
      [...METRIC_HEADER, "comparison_set", "notes"],
    ];
    if (holdoutReady) {
      const majority = majorityMatrix(holdoutLabels, holdoutMatrix);
      baseline.push([
        "Majority-class baseline",
        ...metricValues(metricsFromMatrix(holdoutLabels, majority.matrix)),
        "trained_next_week_holdout",
        `Every hold-out row is predicted as ${majority.label || "the most frequent class"}. Same test rows as the saved models. The week filter does not change this row.`,
      ]);
    } else {
      baseline.push([
        "Majority-class baseline",
        ...metricValues(emptyMetrics()),
        "trained_next_week_holdout",
        "The saved next-week confusion matrix was not found. Run npm run train, then download again.",
      ]);
    }
    if (allPairs.length) {
      const persistence = persistenceMatrix(allPairs);
      baseline.push([
        "Persistence baseline",
        ...metricValues(metricsFromMatrix(persistence.labels, persistence.matrix)),
        "research_consecutive_pairs",
        "The current-week category is used as the prediction of the next week. Calculated on every completed consecutive pair, including Week 1 to Week 2 and Week 2 to Week 3. This is the full research sample, not the model hold-out, because the saved test file does not store each row's current category.",
      ]);
    } else {
      baseline.push([
        "Persistence baseline",
        ...metricValues(emptyMetrics()),
        "research_consecutive_pairs",
        "No completed consecutive-week pairs are stored yet.",
      ]);
    }
    baseline.push([
      "Decision Tree",
      ...metricValues(metricsFromModel(decisionTree)),
      "trained_next_week_holdout",
      "Saved next-week hold-out. student_id and the current-week category are not model inputs.",
    ]);
    baseline.push([
      "Random Forest",
      ...metricValues(metricsFromModel(randomForest)),
      "trained_next_week_holdout",
      "Saved next-week hold-out. student_id and the current-week category are not model inputs.",
    ]);

    const importanceRows: CsvRow[] = [["feature", "importance"]];
    const importance = Object.entries(randomForest?.feature_importance ?? {}).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    );
    for (const [feature, importanceValue] of importance) {
      importanceRows.push([feature, importanceValue]);
    }

    const features = next?.features ?? [];
    const metadata: CsvRow[] = [
      ["setting", "value"],
      ["horizon", "next_week"],
      ["target", "actual_next_category"],
      ["primary_features", "current_sl, current_aw, current_st, current_sh"],
      [
        "excluded_from_primary_models",
        "student_id, actual_current_category",
      ],
      ["stored_model_features", features.join(", ")],
      ["training_rows", next?.samples ?? ""],
      ["test_rows", next?.holdout_rows ?? ""],
      ["test_size", "0.2"],
      ["split", "stratified on the risk category"],
      ["random_seed", "42"],
      ["decision_tree_max_depth", "8"],
      ["decision_tree_class_weight", "none"],
      ["random_forest_n_estimators", "200"],
      ["random_forest_class_weight", "none"],
      ["classes", (trained?.classes ?? [...CLASSES]).join(", ")],
      ["model_version", trained?.generated_by ?? "burnout-ai/training/train.py"],
      [
        "note",
        trained
          ? (trained.notes?.next_week ??
            "Metrics were read from burnout-ai/models/metrics.json. The stored model may include trend features and the current MFBI in addition to the four factor scores.")
          : "burnout-ai/models/metrics.json was not found. Run npm run train before reporting these metrics.",
      ],
    ];

    const modelFiles: Record<(typeof MODEL_EXPORT_FILES)[number], string> = {
      "model_evaluation_results.csv": toCsv(evaluation),
      "confusion_matrix_decision_tree.csv": confusionCsv(decisionTree),
      "confusion_matrix_random_forest.csv": confusionCsv(randomForest),
      "feature_importance_random_forest.csv": toCsv(importanceRows),
      "baseline_comparison.csv": toCsv(baseline),
      "model_metadata.csv": toCsv(metadata),
    };
    for (const filename of MODEL_EXPORT_FILES) {
      files.push({ name: filename, text: modelFiles[filename] });
    }
  }

  if (datasets.includes("functional")) {
    type FunctionalRow = {
      test_id: number;
      feature: string;
      test_procedure: string;
      expected_result: string;
      actual_result: string;
      status: string;
      remarks: string | null;
      tested_at: string | null;
    };
    const tests = await fetchOptional<FunctionalRow>(() =>
      fetchAllPages<FunctionalRow>((from, to) =>
        admin
          .from("functional_test_results")
          .select(
            "test_id, feature, test_procedure, expected_result, actual_result, status, remarks, tested_at"
          )
          .order("test_id", { ascending: true })
          .range(from, to)
      )
    );
    const rows: CsvRow[] = [
      [
        "test_id",
        "feature",
        "test_procedure",
        "expected_result",
        "actual_result",
        "status",
        "remarks",
        "tested_at",
      ],
    ];
    for (const row of tests) {
      rows.push([
        row.test_id,
        row.feature,
        row.test_procedure,
        row.expected_result,
        row.actual_result,
        row.status,
        row.remarks ?? "",
        row.tested_at ?? "",
      ]);
    }
    files.push({
      name: "functional_testing_results.csv",
      text: toCsv(rows),
    });
  }

  if (datasets.includes("usability")) {
    type UsabilityRow = {
      evaluator_id: string;
      evaluator_type: string;
      questionnaire_item: string;
      response_value: number | string | null;
      total_score: number | string | null;
      evaluation_date: string | null;
    };
    const evaluations = await fetchOptional<UsabilityRow>(() =>
      fetchAllPages<UsabilityRow>((from, to) =>
        admin
          .from("usability_evaluation_results")
          .select(
            "evaluation_id, evaluator_id, evaluator_type, questionnaire_item, response_value, total_score, evaluation_date"
          )
          .order("evaluation_id", { ascending: true })
          .range(from, to)
      )
    );
    const rows: CsvRow[] = [
      [
        "evaluator_id",
        "evaluator_type",
        "questionnaire_item",
        "response_value",
        "total_score",
        "evaluation_date",
      ],
    ];
    for (const row of evaluations) {
      rows.push([
        row.evaluator_id,
        row.evaluator_type,
        row.questionnaire_item,
        num(row.response_value),
        num(row.total_score),
        row.evaluation_date ?? "",
      ]);
    }
    files.push({
      name: "usability_evaluation_results.csv",
      text: toCsv(rows),
    });
  }

  return files;
}
