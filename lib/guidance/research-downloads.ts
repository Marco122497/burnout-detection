export const RESEARCH_DOWNLOADS = [
  {
    file: "all",
    filename: "chapter4-research-data.zip",
    label: "All Chapter 4 files",
    detail: "Week 1–2 answers, MFBI, predictions, and model metrics.",
  },
  {
    file: "weekly-monitoring",
    filename: "weekly_monitoring_week1_week2.csv",
    label: "Weekly monitoring records",
    detail: "Anonymous ID, week, all questionnaire answers, and status.",
  },
  {
    file: "mfbi",
    filename: "mfbi_weekly_results.csv",
    label: "MFBI results",
    detail: "Variable scores, normalized scores, MFBI, and risk category.",
  },
  {
    file: "ml-predictions",
    filename: "ml_predictions.csv",
    label: "Machine-learning predictions",
    detail: "Actual label, predicted label, and model for each setup.",
  },
  {
    file: "ml-evaluation",
    filename: "ml_evaluation_results.csv",
    label: "Model evaluation",
    detail: "Accuracy, precision, recall, F1, confusion counts, and feature importance.",
  },
  {
    file: "screenshots",
    filename: "chapter4_system_screenshots.txt",
    label: "Screenshot list",
    detail: "Shots to capture from the working system. Images are not in the download.",
  },
] as const;

export type ResearchDownloadFile = (typeof RESEARCH_DOWNLOADS)[number]["file"];
