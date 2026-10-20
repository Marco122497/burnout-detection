import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  QUESTIONNAIRE_KEYS,
  QUESTIONNAIRE_NAMES,
  type QuestionnaireKey,
  type QuestionRow,
} from "@/lib/student/questionnaires";
import { parseEarlyWarningRemarks } from "@/lib/student/ai-client";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPages } from "@/lib/supabase/fetch-all";

const BOM = "\uFEFF";
const SUBMITTED = new Set(["Submitted", "Reviewed"]);
const RISK_ORDER = ["Low", "Moderate", "High", "Severe"];

const ITEM_PREFIX: Record<QuestionnaireKey, string> = {
  pss: "PSS",
  workload: "WL",
  study: "ST",
  sleep: "SL",
};

const VARIABLE_NAME: Record<QuestionnaireKey, string> = {
  pss: "stress",
  workload: "workload",
  study: "study_time",
  sleep: "sleep",
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

type MfbiRow = {
  mfbi_id: number;
  monitoring_id: number;
  normalized_stress: number | string;
  normalized_academic_workload: number | string;
  normalized_study_time: number | string;
  normalized_sleep_hours: number | string;
  mfbi_score: number | string;
  burnout_risk_level: string;
  computed_at: string | null;
};

type PredictionRow = {
  mfbi_id: number;
  decision_tree_prediction: string;
  decision_tree_confidence: number | string | null;
  random_forest_prediction: string;
  random_forest_confidence: number | string | null;
  final_prediction: string;
  selected_model: string;
  model_version: string | null;
  prediction_date: string | null;
  remarks: string | null;
};

type QuestionExport = QuestionRow & {
  questionnaire_name: string;
  sectionKey: QuestionnaireKey | null;
  itemCode: string;
  variable: string;
};

export type ResearchFileName =
  | "weekly_monitoring_week1_week2.csv"
  | "mfbi_weekly_results.csv"
  | "ml_predictions.csv"
  | "ml_evaluation_results.csv"
  | "chapter4_system_screenshots.txt"
  | "README.txt";

function csvCell(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows: (string | number | null | undefined)[][]) {
  return (
    BOM +
    rows.map((row) => row.map((cell) => csvCell(cell)).join(",")).join("\r\n")
  );
}

function num(value: number | string | null | undefined) {
  if (value == null || value === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : "";
}

function sectionKeyForName(name: string): QuestionnaireKey | null {
  for (const key of QUESTIONNAIRE_KEYS) {
    if (QUESTIONNAIRE_NAMES[key] === name) return key;
  }
  return null;
}

function round4(value: number) {
  return String(Math.round(value * 10000) / 10000);
}

function weightedScores(
  labels: string[],
  matrix: number[][],
  total: number
) {
  let correct = 0;
  let precision = 0;
  let recall = 0;
  let f1 = 0;
  let supportSum = 0;

  for (let actual = 0; actual < labels.length; actual += 1) {
    const support = matrix[actual].reduce((sum, count) => sum + count, 0);
    const predictedCount = matrix.reduce((sum, row) => sum + row[actual], 0);
    const tp = matrix[actual][actual] ?? 0;
    correct += tp;
    const classPrecision = predictedCount ? tp / predictedCount : 0;
    const classRecall = support ? tp / support : 0;
    const classF1 =
      classPrecision + classRecall
        ? (2 * classPrecision * classRecall) / (classPrecision + classRecall)
        : 0;
    precision += classPrecision * support;
    recall += classRecall * support;
    f1 += classF1 * support;
    supportSum += support;
  }

  const weight = supportSum || total;
  return {
    accuracy: total ? correct / total : 0,
    precision: weight ? precision / weight : 0,
    recall: weight ? recall / weight : 0,
    f1: weight ? f1 / weight : 0,
  };
}

async function readTrainedMetrics() {
  try {
    const file = path.join(process.cwd(), "burnout-ai", "models", "metrics.json");
    return JSON.parse(await readFile(file, "utf8")) as {
      generated_by?: string;
      classes?: string[];
      same_week?: TrainedHorizon;
      next_week?: TrainedHorizon;
      notes?: Record<string, string>;
    };
  } catch {
    return null;
  }
}

type TrainedBlock = {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  confusion_matrix?: { labels?: string[]; matrix?: number[][] };
  classification_report?: {
    "weighted avg"?: { support?: number };
  };
  feature_importance?: Record<string, number>;
};

type TrainedHorizon = {
  samples?: number;
  features?: string[];
  decision_tree?: TrainedBlock;
  random_forest?: TrainedBlock;
};

function appendTrainedHorizon(
  rows: (string | number | null | undefined)[][],
  horizon: string,
  block: TrainedHorizon | undefined,
  note: string | undefined
) {
  if (!block) return;
  const samples = Number(block.samples ?? 0);
  const models: [string, TrainedBlock | undefined][] = [
    ["Decision Tree", block.decision_tree],
    ["Random Forest", block.random_forest],
  ];

  for (const [model, metrics] of models) {
    if (!metrics) continue;
    const testRows = Number(
      metrics.classification_report?.["weighted avg"]?.support ?? ""
    );
    const blank = ["", "", "", "", "", ""] as const;
    rows.push([
      "metrics",
      "trained_holdout",
      horizon,
      model,
      metrics.accuracy == null ? "" : round4(Number(metrics.accuracy)),
      metrics.precision == null ? "" : round4(Number(metrics.precision)),
      metrics.recall == null ? "" : round4(Number(metrics.recall)),
      metrics.f1 == null ? "" : round4(Number(metrics.f1)),
      Number.isFinite(testRows) ? testRows : "",
      samples || "",
      ...blank.slice(0, 5),
      note ?? "",
    ]);
    const labels = metrics.confusion_matrix?.labels ?? [];
    const matrix = metrics.confusion_matrix?.matrix ?? [];
    labels.forEach((actual, rowIndex) => {
      labels.forEach((predicted, columnIndex) => {
        rows.push([
          "confusion",
          "trained_holdout",
          horizon,
          model,
          "",
          "",
          "",
          "",
          "",
          "",
          actual,
          predicted,
          matrix[rowIndex]?.[columnIndex] ?? 0,
          "",
          "",
          "",
        ]);
      });
    });
    for (const [feature, importance] of Object.entries(
      metrics.feature_importance ?? {}
    )) {
      rows.push([
        "feature_importance",
        "trained_holdout",
        horizon,
        model,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        feature,
        importance,
        "Influence inside the trained model, not a cause of burnout.",
      ]);
    }
  }
}

export async function buildResearchFiles(): Promise<
  { name: ResearchFileName; text: string }[]
> {
  const admin = createAdminClient();

  const [
    monitoring,
    questionnaires,
    questions,
    answers,
    mfbiRows,
    predictions,
    trained,
  ] = await Promise.all([
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
          "question_id, questionnaire_id, question_text, question_order, response_type, reverse_scored, is_required, is_active, scale_options"
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
          "mfbi_id, monitoring_id, normalized_stress, normalized_academic_workload, normalized_study_time, normalized_sleep_hours, mfbi_score, burnout_risk_level, computed_at"
        )
        .order("mfbi_id", { ascending: true })
        .range(from, to)
    ),
    fetchAllPages<PredictionRow>((from, to) =>
      admin
        .from("ml_predictions")
        .select(
          "mfbi_id, decision_tree_prediction, decision_tree_confidence, random_forest_prediction, random_forest_confidence, final_prediction, selected_model, model_version, prediction_date, remarks"
        )
        .order("prediction_id", { ascending: true })
        .range(from, to)
    ),
    readTrainedMetrics(),
  ]);

  const studentIds = [
    ...new Set(
      monitoring
        .filter((row) => row.week_number === 1 || row.week_number === 2)
        .map((row) => row.student_id)
    ),
  ].sort();
  const respondentWidth = Math.max(3, String(studentIds.length).length);
  const respondentByStudent = new Map(
    studentIds.map((id, index) => [
      id,
      `S${String(index + 1).padStart(respondentWidth, "0")}`,
    ])
  );
  const questionnaireName = new Map(
    questionnaires.map((row) => [row.questionnaire_id, row.questionnaire_name])
  );

  const exportedQuestions: QuestionExport[] = questions
    .filter((question) => question.is_active)
    .map((question) => {
      const name = questionnaireName.get(question.questionnaire_id) ?? "Other";
      const sectionKey = sectionKeyForName(name);
      const itemCode = sectionKey
        ? `${ITEM_PREFIX[sectionKey]}${question.question_order}`
        : `Q${question.question_id}`;
      return {
        ...question,
        questionnaire_name: name,
        sectionKey,
        itemCode,
        variable: sectionKey ? VARIABLE_NAME[sectionKey] : "other",
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
  const predictionByMfbi = new Map(
    predictions.map((row) => [row.mfbi_id, row])
  );

  const submittedIds = new Set(
    monitoring
      .filter((row) => SUBMITTED.has(row.status ?? "Submitted"))
      .map((row) => row.monitoring_id)
  );
  const answersByMonitoring = new Map<number, Map<number, number>>();
  for (const answer of answers) {
    if (!submittedIds.has(answer.monitoring_id)) continue;
    const bucket =
      answersByMonitoring.get(answer.monitoring_id) ?? new Map<number, number>();
    bucket.set(answer.question_id, answer.answer_value);
    answersByMonitoring.set(answer.monitoring_id, bucket);
  }

  const chapterRows = monitoring
    .filter((row) => row.week_number === 1 || row.week_number === 2)
    .sort((a, b) => {
      const respondent = (respondentByStudent.get(a.student_id) ?? "").localeCompare(
        respondentByStudent.get(b.student_id) ?? ""
      );
      if (respondent !== 0) return respondent;
      return a.week_number - b.week_number;
    });

  const weekByStudent = new Map<string, Map<number, MonitoringRow>>();
  for (const row of chapterRows) {
    const weeks = weekByStudent.get(row.student_id) ?? new Map();
    weeks.set(row.week_number, row);
    weekByStudent.set(row.student_id, weeks);
  }

  const monitoringHeader = [
    "respondent_id",
    "week_number",
    "submitted_at",
    "submission_status",
    ...exportedQuestions.map((question) => question.itemCode),
  ];
  const monitoringExport: (string | number | null | undefined)[][] = [
    monitoringHeader,
  ];
  for (const row of chapterRows) {
    const answerMap = answersByMonitoring.get(row.monitoring_id);
    monitoringExport.push([
      respondentByStudent.get(row.student_id) ?? "",
      row.week_number,
      row.submitted_at ?? "",
      row.status ?? "",
      ...exportedQuestions.map((question) => {
        const value = answerMap?.get(question.question_id);
        return value == null ? "" : value;
      }),
    ]);
  }

  const mfbiExport: (string | number | null | undefined)[][] = [
    [
      "respondent_id",
      "week_number",
      "stress_score",
      "academic_workload_score",
      "study_time_score",
      "sleep_hours_score",
      "normalized_stress",
      "normalized_academic_workload",
      "normalized_study_time",
      "normalized_sleep_hours",
      "mfbi_score",
      "mfbi_risk_category",
    ],
  ];
  for (const row of chapterRows) {
    const mfbi = mfbiByMonitoring.get(row.monitoring_id);
    if (!mfbi || !submittedIds.has(row.monitoring_id)) continue;
    mfbiExport.push([
      respondentByStudent.get(row.student_id) ?? "",
      row.week_number,
      num(row.stress_score),
      num(row.academic_workload_score),
      num(row.study_time_score),
      num(row.sleep_hours_score),
      num(mfbi.normalized_stress),
      num(mfbi.normalized_academic_workload),
      num(mfbi.normalized_study_time),
      num(mfbi.normalized_sleep_hours),
      num(mfbi.mfbi_score),
      mfbi.burnout_risk_level,
    ]);
  }

  const predictionExport: (string | number | null | undefined)[][] = [
    [
      "respondent_id",
      "input_week",
      "target_week",
      "model",
      "actual_label",
      "predicted_label",
      "evaluation_setup",
    ],
  ];
  const livePairs: { horizon: string; model: string; actual: string; predicted: string }[] =
    [];

  for (const row of chapterRows) {
    if (!submittedIds.has(row.monitoring_id)) continue;
    const mfbi = mfbiByMonitoring.get(row.monitoring_id);
    const prediction = mfbi ? predictionByMfbi.get(mfbi.mfbi_id) : undefined;
    if (!mfbi || !prediction) continue;
    const respondent = respondentByStudent.get(row.student_id) ?? "";
    const sameWeek = [
      ["Decision Tree", prediction.decision_tree_prediction],
      ["Random Forest", prediction.random_forest_prediction],
    ] as const;
    for (const [model, predicted] of sameWeek) {
      predictionExport.push([
        respondent,
        row.week_number,
        row.week_number,
        model,
        mfbi.burnout_risk_level,
        predicted,
        "same_week_classification",
      ]);
      livePairs.push({
        horizon: "same_week",
        model,
        actual: mfbi.burnout_risk_level,
        predicted,
      });
    }
  }

  for (const [studentId, weeks] of weekByStudent) {
    const week1 = weeks.get(1);
    const week2 = weeks.get(2);
    if (!week1 || !week2) continue;
    if (!submittedIds.has(week1.monitoring_id) || !submittedIds.has(week2.monitoring_id)) {
      continue;
    }
    const current = mfbiByMonitoring.get(week1.monitoring_id);
    const next = mfbiByMonitoring.get(week2.monitoring_id);
    const prediction = current ? predictionByMfbi.get(current.mfbi_id) : undefined;
    if (!current || !next || !prediction) continue;
    const forecast = parseEarlyWarningRemarks(prediction.remarks);
    const predicted = forecast?.next_week_risk ?? "";
    const model = prediction.selected_model || "Random Forest";
    predictionExport.push([
      respondentByStudent.get(studentId) ?? "",
      1,
      2,
      model,
      next.burnout_risk_level,
      predicted,
      "next_week_week1_input_week2_label",
    ]);
    if (predicted) {
      livePairs.push({
        horizon: "next_week",
        model,
        actual: next.burnout_risk_level,
        predicted,
      });
    }
  }

  const evaluationRows: (string | number | null | undefined)[][] = [
    [
      "record_type",
      "source",
      "horizon",
      "model",
      "accuracy",
      "precision",
      "recall",
      "f1",
      "test_rows",
      "samples",
      "actual_label",
      "predicted_label",
      "count",
      "feature",
      "importance",
      "note",
    ],
  ];

  function addLiveEvaluation(horizon: string, note: string) {
    for (const model of ["Decision Tree", "Random Forest"]) {
      const pairs = livePairs.filter(
        (pair) => pair.horizon === horizon && pair.model === model
      );
      if (!pairs.length) continue;
      const labels = RISK_ORDER.filter((label) =>
        pairs.some((pair) => pair.actual === label || pair.predicted === label)
      );
      const matrix = labels.map(() => labels.map(() => 0));
      for (const pair of pairs) {
        const actual = labels.indexOf(pair.actual);
        const predicted = labels.indexOf(pair.predicted);
        if (actual >= 0 && predicted >= 0) matrix[actual][predicted] += 1;
      }
      const scores = weightedScores(labels, matrix, pairs.length);
      evaluationRows.push([
        "metrics",
        "stored_monitoring",
        horizon,
        model,
        round4(scores.accuracy),
        round4(scores.precision),
        round4(scores.recall),
        round4(scores.f1),
        pairs.length,
        pairs.length,
        "",
        "",
        "",
        "",
        "",
        note,
      ]);
      labels.forEach((actual, rowIndex) => {
        labels.forEach((predicted, columnIndex) => {
          evaluationRows.push([
            "confusion",
            "stored_monitoring",
            horizon,
            model,
            "",
            "",
            "",
            "",
            "",
            "",
            actual,
            predicted,
            matrix[rowIndex][columnIndex],
            "",
            "",
            "",
          ]);
        });
      });
    }
  }

  addLiveEvaluation(
    "same_week",
    "Saved Decision Tree and Random Forest labels compared with the MFBI category of the same week. This is current-week classification, not the training hold-out."
  );
  addLiveEvaluation(
    "next_week",
    "Week 1 saved next-week forecast compared with the Week 2 MFBI category. Rows appear only after that forecast has been saved."
  );

  appendTrainedHorizon(evaluationRows, "same_week", trained?.same_week, trained?.notes?.same_week);
  appendTrainedHorizon(
    evaluationRows,
    "next_week",
    trained?.next_week,
    trained?.notes?.next_week
  );
  if (!trained) {
    evaluationRows.push([
      "note",
      "trained_holdout",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "burnout-ai/models/metrics.json was not found. Run npm run train before using the hold-out metrics in Chapter 4.7–4.9.",
    ]);
  }

  const itemList = exportedQuestions
    .map((question) => `${question.itemCode}: ${question.question_text}`)
    .join("\r\n");

  const readme = `${BOM}Chapter 4 research export
Respondent IDs such as S001 replace names, email addresses, phone numbers, and student numbers.
Files include monitoring weeks 1 and 2 only.

weekly_monitoring_week1_week2.csv — one row per student per week, with the numeric answer for each questionnaire item.
mfbi_weekly_results.csv — stored variable scores, normalized scores, MFBI score, and Low / Moderate / High category.
ml_predictions.csv — actual label and predicted label.
  same_week_classification compares the model with that week's MFBI category.
  next_week_week1_input_week2_label uses Week 1 as the input and Week 2 MFBI as the actual label.
ml_evaluation_results.csv — metrics, confusion counts, and feature importance.
  trained_holdout is the Decision Tree and Random Forest test from burnout-ai/models/metrics.json.
  stored_monitoring is the live Week 1 and Week 2 comparison, not a replacement for that hold-out.
Feature importance shows influence inside the trained model. It is not a cause of burnout.

Questionnaire items
${itemList}
`;

  const screenshots = `${BOM}Chapter 4.10 system screenshots
Save these from the running system as PNG or JPG. This download does not include images.

1. Student weekly monitoring questionnaire, showing the items for one open week.
2. Student dashboard with the current MFBI result.
3. Week 1 and Week 2 results, or the trend view that shows both weeks.
4. Guidance AI Model Status card with Decision Tree and Random Forest metrics.
5. A student record that shows the next-week early-warning outlook.
6. The recommendation or alert shown after a monitoring result.

Use the same anonymous IDs as the CSV files if a student must be identified in a caption. Do not include names, email addresses, or student numbers in the published shots.
`;

  return [
    { name: "weekly_monitoring_week1_week2.csv", text: toCsv(monitoringExport) },
    { name: "mfbi_weekly_results.csv", text: toCsv(mfbiExport) },
    { name: "ml_predictions.csv", text: toCsv(predictionExport) },
    { name: "ml_evaluation_results.csv", text: toCsv(evaluationRows) },
    { name: "chapter4_system_screenshots.txt", text: screenshots },
    { name: "README.txt", text: readme },
  ];
}
