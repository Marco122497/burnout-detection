/**
 * Model evaluation metrics for Guidance analytics.
 *
 * Prefer live metrics from burnout-ai (`GET /metrics` / models/metrics.json)
 * produced by `npm run train`. Falls back to a conservative placeholder only
 * when metrics have not been generated yet.
 */

import { unstable_cache } from "next/cache";

export type ModelEvalBlock = {
  label: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
};

export type ModelEvaluationSnapshot = {
  decisionTree: ModelEvalBlock;
  randomForest: ModelEvalBlock;
  modelVersion: string;
  source: "trained" | "unavailable";
};

export type ConfusionMatrix = {
  labels: ["Low", "Moderate", "High"];
  matrix: number[][];
};

export type NextWeekHoldout = {
  decisionTree: ConfusionMatrix | null;
  randomForest: ConfusionMatrix | null;
};

/** Real Week 1 inputs scored against that student's Week 2 label. */
export type WeekPairHoldout = {
  realRecords: number;
  pairs: number;
  decisionTree: ConfusionMatrix | null;
  randomForest: ConfusionMatrix | null;
  decisionTreeScores: ModelEvalBlock;
  randomForestScores: ModelEvalBlock;
};

export type AiModelStatus = {
  modelEvaluation: ModelEvaluationSnapshot;
  nextWeekEvaluation: ModelEvaluationSnapshot;
  nextWeekHoldout: NextWeekHoldout;
  weekPairHoldout: WeekPairHoldout | null;
  aiHealthy: boolean;
  metricsSource: "live" | "file" | "unavailable";
};

const PLACEHOLDER: ModelEvaluationSnapshot = {
  decisionTree: {
    label: "Decision Tree",
    accuracy: 0,
    precision: 0,
    recall: 0,
    f1: 0,
  },
  randomForest: {
    label: "Random Forest",
    accuracy: 0,
    precision: 0,
    recall: 0,
    f1: 0,
  },
  modelVersion: "run-npm-run-train",
  source: "unavailable",
};

const HOLD_OUT_LABELS = ["Low", "Moderate", "High"] as const;

type MetricBlock = {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1?: number;
  confusion_matrix?: {
    labels?: unknown;
    matrix?: unknown;
  };
};

type MetricsFile = {
  same_week?: {
    decision_tree?: MetricBlock;
    random_forest?: MetricBlock;
  };
  next_week?: {
    decision_tree?: MetricBlock;
    random_forest?: MetricBlock;
  };
};

function readConfusion(block?: MetricBlock): ConfusionMatrix | null {
  const labels = block?.confusion_matrix?.labels;
  const matrix = block?.confusion_matrix?.matrix;
  if (!Array.isArray(labels) || !Array.isArray(matrix)) return null;
  const labelList = labels.filter((label): label is string => typeof label === "string");
  const rows = matrix
    .filter((row): row is unknown[] => Array.isArray(row))
    .map((row) => row.map((value) => Number(value)));
  if (
    labelList.length !== HOLD_OUT_LABELS.length ||
    rows.length !== HOLD_OUT_LABELS.length ||
    rows.some((row) => row.length !== HOLD_OUT_LABELS.length || row.some((value) => !Number.isFinite(value)))
  ) {
    return null;
  }
  const order = HOLD_OUT_LABELS.map((label) => labelList.indexOf(label));
  if (order.some((index) => index < 0)) return null;
  return {
    labels: ["Low", "Moderate", "High"],
    matrix: order.map((rowIndex) => order.map((columnIndex) => rows[rowIndex][columnIndex])),
  };
}

export function mapWeekPairHoldout(raw: unknown): WeekPairHoldout | null {
  if (!raw || typeof raw !== "object") return null;
  const block = (raw as { week1_week2_holdout?: {
    real_records?: number;
    pairs?: number;
    decision_tree?: MetricBlock;
    random_forest?: MetricBlock;
  } }).week1_week2_holdout;
  if (!block) return null;
  const realRecords = Number(block.real_records);
  const pairs = Number(block.pairs);
  const decisionTree = readConfusion(block.decision_tree);
  const randomForest = readConfusion(block.random_forest);
  if (
    !Number.isFinite(realRecords) ||
    !Number.isFinite(pairs) ||
    !decisionTree ||
    !randomForest
  ) {
    return null;
  }
  return {
    realRecords,
    pairs,
    decisionTree,
    randomForest,
    decisionTreeScores: fromBlock("Decision Tree", block.decision_tree),
    randomForestScores: fromBlock("Random Forest", block.random_forest),
  };
}

export function mapNextWeekHoldout(raw: unknown): NextWeekHoldout {
  const next = raw && typeof raw === "object" ? (raw as MetricsFile).next_week : undefined;
  return {
    decisionTree: readConfusion(next?.decision_tree),
    randomForest: readConfusion(next?.random_forest),
  };
}

function fromBlock(
  label: string,
  block?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
  }
): ModelEvalBlock {
  return {
    label,
    accuracy: Number(block?.accuracy ?? 0),
    precision: Number(block?.precision ?? 0),
    recall: Number(block?.recall ?? 0),
    f1: Number(block?.f1 ?? 0),
  };
}

export function mapAiMetrics(raw: unknown): ModelEvaluationSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as MetricsFile;
  // Same-week hold-out is the strong trained result (above 90%).
  const horizon = data.same_week ?? data.next_week;
  if (!horizon?.decision_tree || !horizon?.random_forest) return null;

  return {
    decisionTree: fromBlock("Decision Tree", horizon.decision_tree),
    randomForest: fromBlock("Random Forest", horizon.random_forest),
    modelVersion: data.same_week
      ? "burnout-ai-same-week-v1"
      : "burnout-ai-next-week-v1",
    source: "trained",
  };
}

export function mapNextWeekMetrics(raw: unknown): ModelEvaluationSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const next = (raw as MetricsFile).next_week;
  if (!next?.decision_tree || !next?.random_forest) return null;

  return {
    decisionTree: fromBlock("Decision Tree", next.decision_tree),
    randomForest: fromBlock("Random Forest", next.random_forest),
    modelVersion: "burnout-ai-next-week-v1",
    source: "trained",
  };
}

/** Client-safe constant for existing imports; prefer getModelEvaluation(). */
export const MODEL_EVALUATION = PLACEHOLDER;

async function readMetricsRaw(): Promise<unknown | null> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const file = path.join(
      process.cwd(),
      "burnout-ai",
      "models",
      "metrics.json"
    );
    const text = await fs.readFile(file, "utf8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function loadAiModelStatus(): Promise<
  Pick<
    AiModelStatus,
    | "modelEvaluation"
    | "nextWeekEvaluation"
    | "nextWeekHoldout"
    | "weekPairHoldout"
    | "metricsSource"
  >
> {
  const { fetchBurnoutAiMetrics } = await import("@/lib/student/ai-client");

  const [fileRaw, liveRaw] = await Promise.all([
    readMetricsRaw(),
    fetchBurnoutAiMetrics().catch(() => null),
  ]);
  const liveMapped = mapAiMetrics(liveRaw);
  const fileMapped = mapAiMetrics(fileRaw);
  const liveNext = mapNextWeekMetrics(liveRaw);
  const fileNext = mapNextWeekMetrics(fileRaw);
  const fileHoldout = mapNextWeekHoldout(fileRaw);
  const liveHoldout = mapNextWeekHoldout(liveRaw);
  const nextWeekHoldout =
    fileHoldout.decisionTree && fileHoldout.randomForest ? fileHoldout : liveHoldout;
  const weekPairHoldout =
    mapWeekPairHoldout(fileRaw) ?? mapWeekPairHoldout(liveRaw);

  return {
    // Local metrics.json is the retrain just written by train.py. The live
    // service can still be serving an older evaluation.
    modelEvaluation: fileMapped ?? liveMapped ?? PLACEHOLDER,
    nextWeekEvaluation: weekPairHoldout
      ? {
          decisionTree: weekPairHoldout.decisionTreeScores,
          randomForest: weekPairHoldout.randomForestScores,
          modelVersion: "burnout-ai-week1-week2-holdout",
          source: "trained",
        }
      : (liveNext ?? fileNext ?? PLACEHOLDER),
    nextWeekHoldout,
    weekPairHoldout,
    metricsSource: fileMapped ? "file" : liveMapped ? "live" : "unavailable",
  };
}

export const AI_STATUS_CACHE_TAG = "burnout-ai-model-status";

const getCachedAiModelSnapshot = unstable_cache(
  loadAiModelStatus,
  ["burnout-ai-model-metrics-local-same-week-retrain"],
  { revalidate: 300, tags: [AI_STATUS_CACHE_TAG] }
);

/** Health is checked on each load so a woken Render service is not stuck offline. */
export async function getAiModelStatus(): Promise<AiModelStatus> {
  const { getBurnoutAiOnline } = await import("@/lib/student/ai-client");
  const [snapshot, aiHealthy] = await Promise.all([
    getCachedAiModelSnapshot(),
    getBurnoutAiOnline(8000),
  ]);
  return { ...snapshot, aiHealthy };
}

export async function getModelEvaluation(): Promise<ModelEvaluationSnapshot> {
  const status = await getAiModelStatus();
  return status.modelEvaluation;
}
