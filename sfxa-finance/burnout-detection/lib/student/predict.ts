import {
  classifyMfbiScore,
  type BurnoutLevel,
  type MfbiResult,
} from "@/lib/student/mfbi";
import type { SectionScores } from "@/lib/student/scoring";

export type PredictionResult = {
  decision_tree_prediction: BurnoutLevel;
  decision_tree_confidence: number;
  random_forest_prediction: BurnoutLevel;
  random_forest_confidence: number;
  final_prediction: BurnoutLevel;
  selected_model: "Decision Tree" | "Random Forest";
  model_version: string;
  remarks: string;
};

function confidenceFromMargin(score: number, level: BurnoutLevel) {
  const centers: Record<BurnoutLevel, number> = {
    Low: 0.195,
    Moderate: 0.545,
    High: 0.85,
    Severe: 0.85,
  };
  const distance = Math.abs(score - centers[level]);
  return Math.round(Math.max(55, Math.min(96, 96 - distance * 120)) * 100) / 100;
}

/**
 * Lightweight rule-based Decision Tree (Phase 2 stand-in for trained model).
 * Splits on MFBI, stress, and sleep risk using the MFBI classification ranges.
 */
export function predictDecisionTree(
  mfbi: MfbiResult,
  sections: SectionScores
): { prediction: BurnoutLevel; confidence: number } {
  let prediction: BurnoutLevel;

  if (mfbi.mfbi_score >= 0.7 || sections.stress_score >= 30) {
    prediction = "High";
  } else if (mfbi.mfbi_score >= 0.4 || sections.stress_score >= 22) {
    prediction =
      sections.sleep_hours_score < 6 || sections.academic_workload_score >= 7.5
        ? "High"
        : "Moderate";
  } else if (mfbi.mfbi_score > 0.39) {
    prediction =
      sections.study_time_score >= 9 && sections.sleep_hours_score < 6.5
        ? "High"
        : "Moderate";
  } else {
    prediction =
      sections.academic_workload_score >= 7 ? "Moderate" : "Low";
  }

  return {
    prediction,
    confidence: confidenceFromMargin(mfbi.mfbi_score, prediction),
  };
}

/**
 * Lightweight Random Forest ensemble: majority vote across feature trees.
 */
export function predictRandomForest(
  mfbi: MfbiResult,
  sections: SectionScores
): { prediction: BurnoutLevel; confidence: number } {
  const votes: BurnoutLevel[] = [
    classifyMfbiScore(mfbi.mfbi_score),
    classifyMfbiScore(sections.stress_score / 40),
    classifyMfbiScore(sections.academic_workload_score / 10),
    classifyMfbiScore(sections.study_time_score / 12),
    classifyMfbiScore((8 - sections.sleep_hours_score) / 8),
  ];

  const counts = new Map<BurnoutLevel, number>();
  for (const vote of votes) {
    counts.set(vote, (counts.get(vote) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const prediction = ranked[0]?.[0] ?? mfbi.burnout_risk_level;
  const majority = ranked[0]?.[1] ?? 1;
  const confidence =
    Math.round((55 + (majority / votes.length) * 40) * 100) / 100;

  return { prediction, confidence };
}

export function predictBurnoutRisk(
  mfbi: MfbiResult,
  sections: SectionScores
): PredictionResult {
  const decisionTree = predictDecisionTree(mfbi, sections);
  const randomForest = predictRandomForest(mfbi, sections);

  // Prefer Random Forest when confidence is higher or equal.
  const selected_model =
    randomForest.confidence >= decisionTree.confidence
      ? "Random Forest"
      : "Decision Tree";

  const final_prediction =
    selected_model === "Random Forest"
      ? randomForest.prediction
      : decisionTree.prediction;

  return {
    decision_tree_prediction: decisionTree.prediction,
    decision_tree_confidence: decisionTree.confidence,
    random_forest_prediction: randomForest.prediction,
    random_forest_confidence: randomForest.confidence,
    final_prediction,
    selected_model,
    model_version: "phase2-rules-v2-mfbi-ranges",
    remarks: `MFBI ${mfbi.mfbi_score.toFixed(4)}; selected ${selected_model}`,
  };
}
