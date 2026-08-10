import type { BurnoutLevel } from "@/lib/student/mfbi";
import type { PredictionResult } from "@/lib/student/predict";

export type AiFeaturePayload = {
  stress_score: number;
  academic_workload_score: number;
  study_time_score: number;
  sleep_hours_score: number;
  mfbi_score?: number;
  stress_trend?: number;
  workload_trend?: number;
  study_trend?: number;
  sleep_trend?: number;
};

export type EarlyWarningPayload = {
  trend: string;
  next_week_risk: BurnoutLevel | null;
  next_week_confidence: number | null;
  /** ML weighted risk score in [0, 1], when available. */
  next_week_score?: number | null;
  week2_risk: BurnoutLevel | null;
  week2_is_ml: boolean;
  warning_message: string | null;
  has_ml_next_week: boolean;
};

type AiModelPrediction = {
  decision_tree_prediction: BurnoutLevel;
  decision_tree_confidence: number;
  random_forest_prediction: BurnoutLevel;
  random_forest_confidence: number;
  final_prediction: BurnoutLevel;
  risk_level?: BurnoutLevel;
  risk_score?: number;
  selected_model: "Decision Tree" | "Random Forest";
  model_version: string;
  horizon?: "same_week" | "next_week";
  remarks?: string;
  mfbi?: number | null;
};

type EarlyWarningResponse = {
  success: boolean;
  mfbi?: number | null;
  current?: {
    risk_level: BurnoutLevel;
    risk_score: number;
    prediction: AiModelPrediction;
    selected_model: "Decision Tree" | "Random Forest";
    model_version: string;
  };
  early_warning?: {
    trend: string;
    next_week: AiModelPrediction | null;
    week2_projection: {
      risk_level: BurnoutLevel;
      basis: string;
      is_ml_prediction: boolean;
      note: string;
    } | null;
    warning_message: string | null;
    has_ml_next_week: boolean;
  };
  message?: string;
};

const EARLY_WARNING_PREFIX = "EARLY_WARNING_JSON:";

export function encodeEarlyWarningRemarks(
  baseRemarks: string,
  early: EarlyWarningPayload
): string {
  return `${baseRemarks}\n${EARLY_WARNING_PREFIX}${JSON.stringify(early)}`;
}

export function parseEarlyWarningRemarks(
  remarks: string | null | undefined
): EarlyWarningPayload | null {
  if (!remarks) return null;
  const idx = remarks.indexOf(EARLY_WARNING_PREFIX);
  if (idx === -1) return null;
  try {
    return JSON.parse(remarks.slice(idx + EARLY_WARNING_PREFIX.length));
  } catch {
    return null;
  }
}

const DEFAULT_AI_API_URL = "https://burnout-ai-1.onrender.com";

function aiBaseUrl() {
  return (
    process.env.AI_API_URL?.replace(/\/$/, "") ||
    process.env.BURNOUT_AI_URL?.replace(/\/$/, "") ||
    DEFAULT_AI_API_URL
  );
}

export async function checkBurnoutAiHealth(): Promise<boolean> {
  const baseUrl = aiBaseUrl();
  if (!baseUrl) return false;
  try {
    const response = await fetch(`${baseUrl}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { models_ready?: boolean };
    return Boolean(data.models_ready);
  } catch {
    return false;
  }
}

export async function fetchBurnoutAiMetrics(): Promise<unknown | null> {
  const baseUrl = aiBaseUrl();
  if (!baseUrl) return null;
  try {
    const response = await fetch(`${baseUrl}/metrics`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/**
 * Call early-warning endpoint: current risk (same-week ML) + next-week ML
 * + trend-based week-2 projection.
 */
export async function callBurnoutAiEarlyWarning(
  features: AiFeaturePayload,
  options?: {
    studentId?: string;
    historyLevels?: string[];
    historyMfbi?: number[];
  }
): Promise<{
  prediction: PredictionResult;
  earlyWarning: EarlyWarningPayload;
} | null> {
  const baseUrl = aiBaseUrl();
  if (!baseUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${baseUrl}/predict/early-warning`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: options?.studentId,
        features,
        history_levels: options?.historyLevels,
        history_mfbi: options?.historyMfbi,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("burnout-ai early-warning failed", await response.text());
      return null;
    }

    const data = (await response.json()) as EarlyWarningResponse;
    if (!data.success || !data.current?.prediction) {
      console.error("burnout-ai early-warning unsuccessful", data.message);
      return null;
    }

    const current = data.current.prediction;
    const next = data.early_warning?.next_week ?? null;
    const week2 = data.early_warning?.week2_projection ?? null;

    const earlyWarning: EarlyWarningPayload = {
      trend: data.early_warning?.trend ?? "insufficient_history",
      next_week_risk: next?.final_prediction ?? next?.risk_level ?? null,
      next_week_confidence: next?.random_forest_confidence ?? null,
      next_week_score: next?.risk_score ?? null,
      week2_risk: week2?.risk_level ?? null,
      week2_is_ml: Boolean(week2?.is_ml_prediction),
      warning_message: data.early_warning?.warning_message ?? null,
      has_ml_next_week: Boolean(data.early_warning?.has_ml_next_week),
    };

    const prediction: PredictionResult = {
      decision_tree_prediction: current.decision_tree_prediction,
      decision_tree_confidence: current.decision_tree_confidence,
      random_forest_prediction: current.random_forest_prediction,
      random_forest_confidence: current.random_forest_confidence,
      final_prediction: current.final_prediction,
      selected_model: current.selected_model,
      model_version: current.model_version,
      remarks: encodeEarlyWarningRemarks(
        current.remarks ?? `Selected ${current.selected_model}`,
        earlyWarning
      ),
    };

    return { prediction, earlyWarning };
  } catch (error) {
    console.error("burnout-ai early-warning unreachable", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
