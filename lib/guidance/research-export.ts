import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  QUESTIONNAIRE_KEYS,
  QUESTIONNAIRE_NAMES,
  type QuestionnaireKey,
  type QuestionRow,
} from "@/lib/student/questionnaires";
import {
  getAnswerLabelForQuestion,
  resolveScaleOptions,
} from "@/lib/student/scale-options";
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

type ProfileRow = {
  id: string;
  course: string | null;
  year_level: number | null;
  section: string | null;
  department_id: number | null;
};

type DepartmentRow = {
  department_id: number;
  department_code: string;
  department_name: string;
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
};

type NotificationRow = {
  notification_id: number;
  user_id: string;
  notification_type: string;
  priority: string | null;
  is_read: boolean | null;
  created_at: string;
  monitoring_id: number | null;
};

type RecommendationRow = {
  id: number;
  student_id: string;
  monitoring_id: number | null;
  risk_level: string | null;
  prediction_model: string | null;
  llm_model: string | null;
  used_fallback: boolean | null;
  created_at: string;
};

type QuestionExport = QuestionRow & {
  questionnaire_name: string;
  sectionKey: QuestionnaireKey | null;
  itemCode: string;
  variable: string;
};

export type ResearchFileName =
  | "chapter4-analysis.csv"
  | "questionnaire-items.csv"
  | "weekly-monitoring.csv"
  | "weekly-monitoring-answers.csv"
  | "mfbi-results.csv"
  | "ml-predictions.csv"
  | "model-evaluation.csv"
  | "alerts-and-recommendations.csv"
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
    const trainRows =
      samples && Number.isFinite(testRows) ? samples - testRows : "";
    rows.push([
      "trained_holdout",
      horizon,
      model,
      "samples",
      "",
      "",
      samples || "",
    ]);
    rows.push([
      "trained_holdout",
      horizon,
      model,
      "train_rows",
      "",
      "",
      trainRows,
    ]);
    rows.push([
      "trained_holdout",
      horizon,
      model,
      "test_rows",
      "",
      "",
      Number.isFinite(testRows) ? testRows : "",
    ]);
    for (const metric of ["accuracy", "precision", "recall", "f1"] as const) {
      const value = metrics[metric];
      rows.push([
        "trained_holdout",
        horizon,
        model,
        metric,
        "",
        "",
        value == null ? "" : round4(Number(value)),
      ]);
    }
    const labels = metrics.confusion_matrix?.labels ?? [];
    const matrix = metrics.confusion_matrix?.matrix ?? [];
    labels.forEach((actual, rowIndex) => {
      labels.forEach((predicted, columnIndex) => {
        rows.push([
          "trained_holdout",
          horizon,
          model,
          "confusion",
          actual,
          predicted,
          matrix[rowIndex]?.[columnIndex] ?? 0,
        ]);
      });
    });
    if (block.features?.length) {
      rows.push([
        "trained_holdout",
        horizon,
        model,
        "features",
        "",
        "",
        block.features.join("; "),
      ]);
    }
    if (note) {
      rows.push(["trained_holdout", horizon, model, "note", "", "", note]);
    }
  }
}

export async function buildResearchFiles(): Promise<
  { name: ResearchFileName; text: string }[]
> {
  const admin = createAdminClient();

  const [
    monitoring,
    profiles,
    departments,
    questionnaires,
    questions,
    answers,
    mfbiRows,
    predictions,
    notifications,
    recommendations,
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
    fetchAllPages<ProfileRow>((from, to) =>
      admin
        .from("profiles")
        .select("id, course, year_level, section, department_id")
        .eq("role", "Student")
        .order("id", { ascending: true })
        .range(from, to)
    ),
    fetchAllPages<DepartmentRow>((from, to) =>
      admin
        .from("departments")
        .select("department_id, department_code, department_name")
        .order("department_id", { ascending: true })
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
          "mfbi_id, decision_tree_prediction, decision_tree_confidence, random_forest_prediction, random_forest_confidence, final_prediction, selected_model, model_version, prediction_date"
        )
        .order("prediction_id", { ascending: true })
        .range(from, to)
    ),
    fetchAllPages<NotificationRow>((from, to) =>
      admin
        .from("notifications")
        .select(
          "notification_id, user_id, notification_type, priority, is_read, created_at, monitoring_id"
        )
        .in("notification_type", ["Burnout Alert", "Assessment"])
        .order("notification_id", { ascending: true })
        .range(from, to)
    ),
    fetchAllPages<RecommendationRow>((from, to) =>
      admin
        .from("rag_recommendations")
        .select(
          "id, student_id, monitoring_id, risk_level, prediction_model, llm_model, used_fallback, created_at"
        )
        .order("id", { ascending: true })
        .range(from, to)
    ),
    readTrainedMetrics(),
  ]);

  const studentIds = [...new Set(monitoring.map((row) => row.student_id))].sort();
  const respondentWidth = Math.max(3, String(studentIds.length).length);
  const respondentByStudent = new Map(
    studentIds.map((id, index) => [
      id,
      `S${String(index + 1).padStart(respondentWidth, "0")}`,
    ])
  );
  const profileById = new Map(profiles.map((row) => [row.id, row]));
  const departmentById = new Map(
    departments.map((row) => [row.department_id, row])
  );
  const questionnaireName = new Map(
    questionnaires.map((row) => [row.questionnaire_id, row.questionnaire_name])
  );

  const exportedQuestions: QuestionExport[] = questions
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

  const questionById = new Map(
    exportedQuestions.map((question) => [question.question_id, question])
  );
  const monitoringById = new Map(
    monitoring.map((row) => [row.monitoring_id, row])
  );
  const mfbiByMonitoring = new Map(
    mfbiRows.map((row) => [row.monitoring_id, row])
  );
  const predictionByMfbi = new Map(
    predictions.map((row) => [row.mfbi_id, row])
  );

  function profileFields(studentId: string) {
    const profile = profileById.get(studentId);
    const department = profile?.department_id
      ? departmentById.get(profile.department_id)
      : undefined;
    return {
      respondent: respondentByStudent.get(studentId) ?? "",
      programCode: department?.department_code ?? "",
      programName: department?.department_name ?? profile?.course ?? "",
      yearLevel: profile?.year_level ?? "",
      section: profile?.section ?? "",
    };
  }

  const submitted = monitoring.filter((row) =>
    SUBMITTED.has(row.status ?? "Submitted")
  );
  const submittedIds = new Set(submitted.map((row) => row.monitoring_id));

  const answersByMonitoring = new Map<number, Map<number, number>>();
  for (const answer of answers) {
    if (!submittedIds.has(answer.monitoring_id)) continue;
    const bucket =
      answersByMonitoring.get(answer.monitoring_id) ?? new Map<number, number>();
    bucket.set(answer.question_id, answer.answer_value);
    answersByMonitoring.set(answer.monitoring_id, bucket);
  }

  const analysisHeader = [
    "respondent_id",
    "week_number",
    "submitted_at",
    "monitoring_id",
    "program_code",
    "program_name",
    "year_level",
    "section",
    "stress_score",
    "workload_score",
    "study_time_score",
    "sleep_score",
    "stress_norm",
    "workload_norm",
    "study_time_norm",
    "sleep_norm",
    "mfbi_score",
    "mfbi_risk",
    "decision_tree_prediction",
    "random_forest_prediction",
    ...exportedQuestions.map((question) => question.itemCode),
  ];

  const analysisRows: (string | number | null | undefined)[][] = [analysisHeader];
  const sortedSubmitted = [...submitted].sort((a, b) => {
    const respondent = profileFields(a.student_id).respondent.localeCompare(
      profileFields(b.student_id).respondent
    );
    if (respondent !== 0) return respondent;
    return a.week_number - b.week_number;
  });

  for (const row of sortedSubmitted) {
    const who = profileFields(row.student_id);
    const mfbi = mfbiByMonitoring.get(row.monitoring_id);
    const prediction = mfbi ? predictionByMfbi.get(mfbi.mfbi_id) : undefined;
    const answerMap = answersByMonitoring.get(row.monitoring_id);
    analysisRows.push([
      who.respondent,
      row.week_number,
      row.submitted_at ?? "",
      row.monitoring_id,
      who.programCode,
      who.programName,
      who.yearLevel,
      who.section,
      num(row.stress_score),
      num(row.academic_workload_score),
      num(row.study_time_score),
      num(row.sleep_hours_score),
      num(mfbi?.normalized_stress),
      num(mfbi?.normalized_academic_workload),
      num(mfbi?.normalized_study_time),
      num(mfbi?.normalized_sleep_hours),
      num(mfbi?.mfbi_score),
      mfbi?.burnout_risk_level ?? "",
      prediction?.decision_tree_prediction ?? "",
      prediction?.random_forest_prediction ?? "",
      ...exportedQuestions.map((question) => {
        const value = answerMap?.get(question.question_id);
        return value == null ? "" : value;
      }),
    ]);
  }

  const questionnaireRows: (string | number | null | undefined)[][] = [
    [
      "item_code",
      "variable",
      "questionnaire",
      "question_order",
      "question_text",
      "response_type",
      "reverse_scored",
      "response_scale",
    ],
  ];
  for (const question of exportedQuestions) {
    const scale =
      question.sectionKey == null
        ? ""
        : resolveScaleOptions(
            question.sectionKey,
            question,
            question.questionnaire_name
          )
            .map((option) => `${option.value}=${option.label}`)
            .join("; ");
    questionnaireRows.push([
      question.itemCode,
      question.variable,
      question.questionnaire_name,
      question.question_order,
      question.question_text,
      question.response_type,
      question.reverse_scored ? "yes" : "no",
      scale,
    ]);
  }

  const monitoringRows: (string | number | null | undefined)[][] = [
    [
      "monitoring_id",
      "respondent_id",
      "week_number",
      "status",
      "submitted_at",
      "program_code",
      "program_name",
      "year_level",
      "section",
      "term_id",
    ],
  ];
  for (const row of monitoring) {
    const who = profileFields(row.student_id);
    monitoringRows.push([
      row.monitoring_id,
      who.respondent,
      row.week_number,
      row.status ?? "",
      row.submitted_at ?? "",
      who.programCode,
      who.programName,
      who.yearLevel,
      who.section,
      row.term_id,
    ]);
  }

  const answerRows: (string | number | null | undefined)[][] = [
    [
      "monitoring_id",
      "respondent_id",
      "week_number",
      "question_id",
      "item_code",
      "variable",
      "answer_value",
      "answer_label",
    ],
  ];
  for (const answer of answers) {
    if (!submittedIds.has(answer.monitoring_id)) continue;
    const row = monitoringById.get(answer.monitoring_id);
    const question = questionById.get(answer.question_id);
    if (!row || !question) continue;
    const label =
      question.sectionKey == null
        ? ""
        : (getAnswerLabelForQuestion(
            question.sectionKey,
            question,
            answer.answer_value,
            question.questionnaire_name
          ) ?? "");
    answerRows.push([
      answer.monitoring_id,
      profileFields(row.student_id).respondent,
      row.week_number,
      answer.question_id,
      question.itemCode,
      question.variable,
      answer.answer_value,
      label,
    ]);
  }

  const mfbiExport: (string | number | null | undefined)[][] = [
    [
      "monitoring_id",
      "respondent_id",
      "week_number",
      "stress_score",
      "workload_score",
      "study_time_score",
      "sleep_score",
      "stress_norm",
      "workload_norm",
      "study_time_norm",
      "sleep_norm",
      "mfbi_score",
      "mfbi_risk",
      "computed_at",
    ],
  ];
  for (const mfbi of mfbiRows) {
    const row = monitoringById.get(mfbi.monitoring_id);
    if (!row || !submittedIds.has(row.monitoring_id)) continue;
    mfbiExport.push([
      mfbi.monitoring_id,
      profileFields(row.student_id).respondent,
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
      mfbi.computed_at ?? "",
    ]);
  }

  const predictionExport: (string | number | null | undefined)[][] = [
    [
      "monitoring_id",
      "respondent_id",
      "week_number",
      "mfbi_risk",
      "decision_tree_prediction",
      "decision_tree_confidence",
      "random_forest_prediction",
      "random_forest_confidence",
      "final_prediction",
      "selected_model",
      "model_version",
      "prediction_date",
    ],
  ];
  const livePairs: {
    model: string;
    actual: string;
    predicted: string;
  }[] = [];
  for (const mfbi of mfbiRows) {
    const row = monitoringById.get(mfbi.monitoring_id);
    const prediction = predictionByMfbi.get(mfbi.mfbi_id);
    if (!row || !prediction || !submittedIds.has(row.monitoring_id)) continue;
    predictionExport.push([
      row.monitoring_id,
      profileFields(row.student_id).respondent,
      row.week_number,
      mfbi.burnout_risk_level,
      prediction.decision_tree_prediction,
      num(prediction.decision_tree_confidence),
      prediction.random_forest_prediction,
      num(prediction.random_forest_confidence),
      prediction.final_prediction,
      prediction.selected_model,
      prediction.model_version ?? "",
      prediction.prediction_date ?? "",
    ]);
    livePairs.push(
      {
        model: "Decision Tree",
        actual: mfbi.burnout_risk_level,
        predicted: prediction.decision_tree_prediction,
      },
      {
        model: "Random Forest",
        actual: mfbi.burnout_risk_level,
        predicted: prediction.random_forest_prediction,
      }
    );
  }

  const evaluationRows: (string | number | null | undefined)[][] = [
    [
      "source",
      "horizon",
      "model",
      "metric",
      "actual",
      "predicted",
      "value",
    ],
  ];
  const riskCounts = new Map<string, number>();
  for (const mfbi of mfbiRows) {
    if (!submittedIds.has(mfbi.monitoring_id)) continue;
    riskCounts.set(
      mfbi.burnout_risk_level,
      (riskCounts.get(mfbi.burnout_risk_level) ?? 0) + 1
    );
  }
  for (const label of RISK_ORDER) {
    if (!riskCounts.has(label)) continue;
    evaluationRows.push([
      "live_monitoring",
      "submitted_weeks",
      "",
      "risk_count",
      label,
      "",
      riskCounts.get(label) ?? 0,
    ]);
  }
  evaluationRows.push([
    "live_monitoring",
    "submitted_weeks",
    "",
    "submitted_rows",
    "",
    "",
    submitted.length,
  ]);
  evaluationRows.push([
    "live_monitoring",
    "submitted_weeks",
    "",
    "respondents",
    "",
    "",
    studentIds.length,
  ]);

  for (const model of ["Decision Tree", "Random Forest"]) {
    const pairs = livePairs.filter((pair) => pair.model === model);
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
      "stored_predictions_vs_mfbi",
      "submitted_weeks",
      model,
      "rows",
      "",
      "",
      pairs.length,
    ]);
    for (const metric of ["accuracy", "precision", "recall", "f1"] as const) {
      evaluationRows.push([
        "stored_predictions_vs_mfbi",
        "submitted_weeks",
        model,
        metric,
        "",
        "",
        round4(scores[metric]),
      ]);
    }
    labels.forEach((actual, rowIndex) => {
      labels.forEach((predicted, columnIndex) => {
        evaluationRows.push([
          "stored_predictions_vs_mfbi",
          "submitted_weeks",
          model,
          "confusion",
          actual,
          predicted,
          matrix[rowIndex][columnIndex],
        ]);
      });
    });
  }
  evaluationRows.push([
    "stored_predictions_vs_mfbi",
    "submitted_weeks",
    "",
    "note",
    "",
    "",
    "These rows compare saved predictions with the MFBI risk already stored for the same week. They do not replace a held-out train/test evaluation.",
  ]);

  appendTrainedHorizon(
    evaluationRows,
    "same_week",
    trained?.same_week,
    "test_size 0.2, random_state 42, stratified split, class_weight balanced. From burnout-ai/models/metrics.json."
  );
  appendTrainedHorizon(
    evaluationRows,
    "next_week",
    trained?.next_week,
    trained?.notes?.next_week ??
      "Next-week hold-out from burnout-ai/models/metrics.json."
  );
  if (!trained) {
    evaluationRows.push([
      "trained_holdout",
      "",
      "",
      "note",
      "",
      "",
      "burnout-ai/models/metrics.json was not found. Run npm run train to generate hold-out metrics.",
    ]);
  }

  const seenAlerts = new Set<string>();
  const alertRows: (string | number | null | undefined)[][] = [
    [
      "record_type",
      "respondent_id",
      "monitoring_id",
      "week_number",
      "kind",
      "risk_level",
      "priority",
      "is_read",
      "created_at",
      "model",
    ],
  ];
  const orderedNotifications = [...notifications].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  for (const notice of orderedNotifications) {
    const linked = notice.monitoring_id
      ? monitoringById.get(notice.monitoring_id)
      : undefined;
    const studentId = linked?.student_id ?? notice.user_id;
    const respondent = respondentByStudent.get(studentId);
    if (!respondent) continue;
    const key = `${notice.monitoring_id ?? "none"}:${notice.notification_type}:${respondent}`;
    if (notice.monitoring_id && seenAlerts.has(key)) continue;
    if (notice.monitoring_id) seenAlerts.add(key);
    const mfbi = linked ? mfbiByMonitoring.get(linked.monitoring_id) : undefined;
    alertRows.push([
      "notification",
      respondent,
      notice.monitoring_id ?? "",
      linked?.week_number ?? "",
      notice.notification_type,
      mfbi?.burnout_risk_level ?? "",
      notice.priority ?? "",
      notice.is_read ? "yes" : "no",
      notice.created_at,
      "",
    ]);
  }
  for (const recommendation of recommendations) {
    const linked = recommendation.monitoring_id
      ? monitoringById.get(recommendation.monitoring_id)
      : undefined;
    const respondent = respondentByStudent.get(recommendation.student_id);
    if (!respondent) continue;
    alertRows.push([
      "recommendation",
      respondent,
      recommendation.monitoring_id ?? "",
      linked?.week_number ?? "",
      "recommendation",
      recommendation.risk_level ?? "",
      "",
      "",
      recommendation.created_at,
      recommendation.prediction_model ?? recommendation.llm_model ?? "",
    ]);
  }

  const readme = `${BOM}Chapter 4 research export
Respondent IDs such as S001 replace student names. Names, email addresses, phone numbers, and student numbers are not included.
program_code and program_name are the academic program. year_level and section are included.
chapter4-analysis.csv has one row for each submitted monitoring week.
weekly-monitoring-answers.csv keeps the original item responses and labels.
mfbi-results.csv is the score saved when the student submitted, including the Low, Moderate, High, or Severe category.
model-evaluation.csv has two sources. stored_predictions_vs_mfbi compares saved predictions with the MFBI category for the same week. trained_holdout is the Decision Tree and Random Forest test result from burnout-ai/models/metrics.json when that file is present.
alerts-and-recommendations.csv keeps the warning type, risk, and date. Notification message text is omitted because it can contain a student name.
`;

  return [
    { name: "chapter4-analysis.csv", text: toCsv(analysisRows) },
    { name: "questionnaire-items.csv", text: toCsv(questionnaireRows) },
    { name: "weekly-monitoring.csv", text: toCsv(monitoringRows) },
    { name: "weekly-monitoring-answers.csv", text: toCsv(answerRows) },
    { name: "mfbi-results.csv", text: toCsv(mfbiExport) },
    { name: "ml-predictions.csv", text: toCsv(predictionExport) },
    { name: "model-evaluation.csv", text: toCsv(evaluationRows) },
    { name: "alerts-and-recommendations.csv", text: toCsv(alertRows) },
    { name: "README.txt", text: readme },
  ];
}
