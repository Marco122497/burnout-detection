/** YYYY-MM-DD in local time */
export function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function defaultReportDateRange(now = new Date()) {
  return getReportRangePreset("month", now);
}

export const REPORT_RANGE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "annual", label: "Annual" },
] as const;

export type ReportRangePreset = (typeof REPORT_RANGE_PRESETS)[number]["id"];

export function getReportRangePreset(
  preset: ReportRangePreset,
  now = new Date()
) {
  const to = toDateInputValue(now);

  if (preset === "today") {
    return { from: to, to };
  }

  if (preset === "week") {
    const start = new Date(now);
    const day = start.getDay(); // Sunday = 0
    start.setDate(start.getDate() - day);
    return { from: toDateInputValue(start), to };
  }

  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toDateInputValue(start), to };
  }

  const start = new Date(now.getFullYear(), 0, 1);
  return { from: toDateInputValue(start), to };
}

export function matchReportRangePreset(
  from: string,
  to: string,
  now = new Date()
): ReportRangePreset | null {
  for (const preset of REPORT_RANGE_PRESETS) {
    const range = getReportRangePreset(preset.id, now);
    if (range.from === from && range.to === to) return preset.id;
  }
  return null;
}

export function isValidDateInput(value: string | undefined): value is string {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function resolveReportDateRange(params: {
  from?: string;
  to?: string;
}) {
  const defaults = defaultReportDateRange();
  let from = isValidDateInput(params.from) ? params.from : defaults.from;
  let to = isValidDateInput(params.to) ? params.to : defaults.to;
  if (from > to) {
    const swap = from;
    from = to;
    to = swap;
  }
  return { from, to };
}

export function formatReportPeriodLabel(from: string, to: string) {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  const long: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };

  if (from === to) {
    return new Intl.DateTimeFormat("en-PH", long).format(fromDate);
  }

  const sameYear = fromDate.getFullYear() === toDate.getFullYear();
  const sameMonth = sameYear && fromDate.getMonth() === toDate.getMonth();

  if (sameMonth) {
    const monthYear = new Intl.DateTimeFormat("en-PH", {
      month: "long",
      year: "numeric",
    }).format(fromDate);
    return `${fromDate.getDate()}–${toDate.getDate()} ${monthYear}`;
  }

  if (sameYear) {
    const fromPart = new Intl.DateTimeFormat("en-PH", {
      month: "long",
      day: "numeric",
    }).format(fromDate);
    return `${fromPart} – ${new Intl.DateTimeFormat("en-PH", long).format(toDate)}`;
  }

  const formatter = new Intl.DateTimeFormat("en-PH", long);
  return `${formatter.format(fromDate)} – ${formatter.format(toDate)}`;
}

/** Keep rows whose monitoring_date falls within [from, to] (inclusive). */
export function filterRowsByMonitoringDate<
  T extends { monitoring_date?: string | null },
>(rows: T[], from: string, to: string): T[] {
  return rows.filter((row) => {
    if (!row.monitoring_date) return false;
    const day = row.monitoring_date.slice(0, 10);
    return day >= from && day <= to;
  });
}

export function isDateInRange(
  value: string | null | undefined,
  from: string,
  to: string
) {
  if (!value) return false;
  const day = value.slice(0, 10);
  return day >= from && day <= to;
}
