export const RESEARCH_WEEKS = [
  { value: "all", label: "All Weeks" },
  { value: "1", label: "Week 1" },
  { value: "2", label: "Week 2" },
  { value: "3", label: "Week 3" },
] as const;

export type ResearchWeekFilter = "all" | 1 | 2 | 3;

export const MODEL_EXPORT_FILES = [
  "model_evaluation_results.csv",
  "confusion_matrix_decision_tree.csv",
  "confusion_matrix_random_forest.csv",
  "feature_importance_random_forest.csv",
  "baseline_comparison.csv",
  "model_metadata.csv",
] as const;

export const RESEARCH_DATASETS = [
  {
    key: "profile",
    filename: "respondent_profile.csv",
    label: "Respondent Profile",
    detail: "Approved demographic and participation information.",
    download: "csv",
  },
  {
    key: "participation",
    filename: "weekly_monitoring_participation.csv",
    label: "Weekly Participation",
    detail: "Completion records per student and monitoring week.",
    download: "csv",
  },
  {
    key: "responses",
    filename: "weekly_questionnaire_responses.csv",
    label: "Questionnaire Responses",
    detail: "All 21 item-level responses.",
    download: "csv",
  },
  {
    key: "mfbi",
    filename: "weekly_mfbi_results.csv",
    label: "Factor Scores and MFBI",
    detail: "Raw scores, normalized scores, MFBI, and risk categories.",
    download: "csv",
  },
  {
    key: "forecasting",
    filename: "next_week_forecasting_dataset.csv",
    label: "Next-Week Forecasting Dataset",
    detail: "Consecutive student-level records for forecasting.",
    download: "csv",
  },
  {
    key: "models",
    filename: "model_evaluation_results.csv",
    label: "Model Evaluation",
    detail:
      "Metrics for Decision Tree, Random Forest, and baselines, plus confusion matrices and feature importance.",
    download: "zip",
  },
  {
    key: "functional",
    filename: "functional_testing_results.csv",
    label: "Functional Testing",
    detail: "Actual system test cases and results.",
    download: "csv",
  },
  {
    key: "usability",
    filename: "usability_evaluation_results.csv",
    label: "Usability Evaluation",
    detail: "Anonymized evaluator responses and scores.",
    download: "csv",
  },
] as const;

export type ResearchDatasetKey = (typeof RESEARCH_DATASETS)[number]["key"];

export function isResearchDatasetKey(value: string): value is ResearchDatasetKey {
  return RESEARCH_DATASETS.some((item) => item.key === value);
}

export function parseResearchWeek(value: string | null): ResearchWeekFilter {
  if (value === "1" || value === "2" || value === "3") return Number(value) as 1 | 2 | 3;
  return "all";
}

export function researchFilename(filename: string, week: ResearchWeekFilter) {
  if (week === "all") return filename;
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return `${filename}_week_${week}`;
  return `${filename.slice(0, dot)}_week_${week}${filename.slice(dot)}`;
}
