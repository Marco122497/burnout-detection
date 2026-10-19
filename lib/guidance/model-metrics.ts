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

export type AiModelStatus = {
  modelEvaluation: ModelEvaluationSnapshot;
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

type MetricsFile = {
  same_week?: {
    decision_tree?: {
      accuracy?: number;
      precision?: number;
      recall?: number;
      f1?: number;
    };
    random_forest?: {
      accuracy?: number;
      precision?: number;
      recall?: number;
      f1?: number;
    };
  };
  next_week?: {
    decision_tree?: {
      accuracy?: number;
      precision?: number;
      recall?: number;
      f1?: number;
    };
    random_forest?: {
      accuracy?: number;
      precision?: number;
      recall?: number;
      f1?: number;
    };
  };
};

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

/** Client-safe constant for existing imports; prefer getModelEvaluation(). */
export const MODEL_EVALUATION = PLACEHOLDER;

async function readMetricsFromFile(): Promise<ModelEvaluationSnapshot | null> {
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
    return mapAiMetrics(JSON.parse(text));
  } catch {
    return null;
  }
}

async function loadAiModelStatus(): Promise<
  Pick<AiModelStatus, "modelEvaluation" | "metricsSource">
> {
  const { fetchBurnoutAiMetrics } = await import("@/lib/student/ai-client");

  const fileMapped = await readMetricsFromFile();
  const liveMapped = mapAiMetrics(await fetchBurnoutAiMetrics().catch(() => null));

  if (liveMapped) {
    return {
      modelEvaluation: liveMapped,
      metricsSource: "live",
    };
  }

  if (fileMapped) {
    return {
      modelEvaluation: fileMapped,
      metricsSource: "file",
    };
  }

  return {
    modelEvaluation: PLACEHOLDER,
    metricsSource: "unavailable",
  };
}

export const AI_STATUS_CACHE_TAG = "burnout-ai-model-status";

const getCachedAiModelSnapshot = unstable_cache(
  loadAiModelStatus,
  ["burnout-ai-model-metrics-same-week"],
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
