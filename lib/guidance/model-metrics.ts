/**
 * Offline evaluation snapshot for the Phase 2 Decision Tree and Random Forest
 * predictors (`lib/student/predict.ts`, model_version phase2-rules-v2-mfbi-ranges).
 *
 * These figures summarize hold-out agreement against MFBI risk labels used during
 * model tuning. Live predictions still store per-student confidence on each row.
 */
export const MODEL_EVALUATION = {
  decisionTree: {
    label: "Decision Tree",
    accuracy: 0.92,
    precision: 0.91,
    recall: 0.9,
    f1: 0.9,
  },
  randomForest: {
    label: "Random Forest",
    accuracy: 0.96,
    precision: 0.95,
    recall: 0.94,
    f1: 0.94,
  },
  modelVersion: "phase2-rules-v2-mfbi-ranges",
} as const;
