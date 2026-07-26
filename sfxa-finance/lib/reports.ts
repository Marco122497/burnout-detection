export const REPORT_PERIODS = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "annual", label: "Annual" },
] as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[number]["id"];

export function isReportPeriod(value: string | undefined): value is ReportPeriod {
  return REPORT_PERIODS.some((item) => item.id === value);
}
