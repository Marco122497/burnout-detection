export const RESEARCH_DOWNLOADS = [
  {
    file: "all",
    filename: "chapter4-research-data.zip",
    label: "All Chapter 4 files",
    detail: "One zip of every file below.",
  },
  {
    file: "chapter4-analysis",
    filename: "chapter4-analysis.csv",
    label: "Analysis dataset",
    detail: "One row per submitted week.",
  },
  {
    file: "questionnaire-items",
    filename: "questionnaire-items.csv",
    label: "Questionnaire",
    detail: "Item codes, wording, and response scales.",
  },
  {
    file: "weekly-monitoring",
    filename: "weekly-monitoring.csv",
    label: "Weekly monitoring",
    detail: "Week, status, and submission date.",
  },
  {
    file: "weekly-monitoring-answers",
    filename: "weekly-monitoring-answers.csv",
    label: "Answers",
    detail: "Original response for each item.",
  },
  {
    file: "mfbi-results",
    filename: "mfbi-results.csv",
    label: "MFBI results",
    detail: "Component scores, MFBI score, and risk.",
  },
  {
    file: "ml-predictions",
    filename: "ml-predictions.csv",
    label: "Predictions",
    detail: "Decision Tree and Random Forest for each week.",
  },
  {
    file: "model-evaluation",
    filename: "model-evaluation.csv",
    label: "Model evaluation",
    detail: "Accuracy, precision, recall, F1, and confusion matrices.",
  },
  {
    file: "alerts-and-recommendations",
    filename: "alerts-and-recommendations.csv",
    label: "Alerts and recommendations",
    detail: "Warning type, risk, and date. Message text is left out.",
  },
] as const;

export type ResearchDownloadFile = (typeof RESEARCH_DOWNLOADS)[number]["file"];
