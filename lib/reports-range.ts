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

export function resolveReportWeek(
  value: string | undefined,
  maxWeek: number
) {
  const max = Math.max(1, Math.floor(maxWeek) || 1);
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return max;
  return Math.min(parsed, max);
}

export const REPORT_PERIODS = [
  { id: "week", label: "Weekly" },
  { id: "month", label: "Monthly" },
  { id: "range", label: "Date range" },
  { id: "all", label: "General (all records)" },
] as const;

export type ReportPeriodMode = (typeof REPORT_PERIODS)[number]["id"];

export type ReportPeriod = {
  mode: ReportPeriodMode;
  week: number;
  /** YYYY-MM */
  month: string;
  from: string;
  to: string;
  /** Null for Weekly, which reads one monitoring week instead of dates. */
  range: MonitoringDateRange | null;
  label: string;
};

export type ReportPeriodParams = {
  period?: string;
  week?: string;
  month?: string;
  from?: string;
  to?: string;
};

function isMonthInput(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

function monthBounds(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function resolveReportPeriod(
  params: ReportPeriodParams,
  maxWeek: number,
  now = new Date()
): ReportPeriod {
  const mode: ReportPeriodMode =
    REPORT_PERIODS.find((item) => item.id === params.period)?.id ?? "week";
  const week = resolveReportWeek(params.week, maxWeek);
  const month = isMonthInput(params.month)
    ? params.month
    : toDateInputValue(now).slice(0, 7);
  const dates = resolveReportDateRange(params);

  if (mode === "month") {
    const bounds = monthBounds(month);
    const label = new Intl.DateTimeFormat("en-PH", {
      month: "long",
      year: "numeric",
    }).format(new Date(`${bounds.from}T00:00:00`));
    return { mode, week, month, ...bounds, range: bounds, label };
  }

  if (mode === "range") {
    return {
      mode,
      week,
      month,
      ...dates,
      range: dates,
      label: formatReportPeriodLabel(dates.from, dates.to),
    };
  }

  if (mode === "all") {
    return {
      mode,
      week,
      month,
      ...dates,
      range: { from: null, to: null },
      label: "All records",
    };
  }

  return { mode, week, month, ...dates, range: null, label: `Week ${week}` };
}

export const REPORT_YEAR_LEVELS = [1, 2, 3, 4] as const;

export function resolveReportYearLevel(value: string | undefined) {
  const parsed = Number(value);
  return (REPORT_YEAR_LEVELS as readonly number[]).includes(parsed)
    ? parsed
    : null;
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

/** Inclusive YYYY-MM-DD bounds; null leaves that side open (General = both null). */
export type MonitoringDateRange = { from: string | null; to: string | null };

/** submitted_at bounds in Philippine time so a day matches what users see. */
export function monitoringRangeBounds(range: MonitoringDateRange) {
  return {
    start: range.from ? `${range.from}T00:00:00+08:00` : null,
    end: range.to ? `${range.to}T23:59:59.999+08:00` : null,
  };
}

export function isLaterSubmission(
  a: { submitted_at: string | null; created_at: string },
  b: { submitted_at: string | null; created_at: string }
) {
  return (
    Date.parse(a.submitted_at ?? a.created_at) >
    Date.parse(b.submitted_at ?? b.created_at)
  );
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
