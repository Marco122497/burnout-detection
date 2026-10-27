"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangleIcon, Loader2 } from "lucide-react";

import { useNavigationPending } from "@/components/layout/navigation-pending";
import { PageHeading } from "@/components/layout/page-heading";
import {
  AiEarlyWarningOverviewCards,
  AiEarlyWarningStudentsCard,
  AiModelStatusCard,
} from "@/components/shared/ai-early-warning-panel";
import { TablePagination } from "@/components/shared/table-pagination";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { formatDateTime } from "@/lib/auth/roles";
import type {
  AiModelStatus,
  ModelEvaluationSnapshot,
  WeekPairHoldout,
} from "@/lib/guidance/model-metrics";
import type {
  getGuidanceAnalytics,
  ValidScoredSummary,
  WeekVariableAverages,
} from "@/lib/guidance/monitoring";
import { cn, formatYearLevel } from "@/lib/utils";

type Analytics = ReturnType<typeof getGuidanceAnalytics>;

function sharePercent(count: number, total: number) {
  if (!total) return 0;
  return Math.round((count / total) * 10000) / 100;
}

function exactShare(count: number, total: number) {
  return `${count.toLocaleString()} · ${sharePercent(count, total).toFixed(2)}%`;
}

const YEAR_FILTER_OPTIONS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
] as const;

const riskConfig = {
  low: { label: "Low Risk", color: "oklch(0.72 0.15 160)" },
  moderate: { label: "Moderate Risk", color: "oklch(0.8 0.15 85)" },
  high: { label: "High Risk", color: "oklch(0.68 0.19 40)" },
} satisfies ChartConfig;

const variableClassConfig = {
  low: { label: "Low", color: "oklch(0.72 0.15 160)" },
  moderate: { label: "Moderate", color: "oklch(0.8 0.15 85)" },
  high: { label: "High", color: "oklch(0.68 0.19 40)" },
} satisfies ChartConfig;

const VARIABLE_OPTIONS = [
  { value: "all", short: "All", label: "All variables" },
  { value: "stress", short: "SL", label: "Stress Level" },
  { value: "workload", short: "AW", label: "Academic Workload" },
  { value: "study", short: "ST", label: "Study Time" },
  { value: "sleep", short: "SH", label: "Sleep Hours" },
] as const;

const COURSE_FUSE_COLORS = {
  low: "oklch(0.72 0.15 160)",
  moderate: "oklch(0.8 0.15 85)",
  high: "oklch(0.68 0.19 40)",
} as const;

const courseRiskConfig = {
  low: { label: "Low", color: COURSE_FUSE_COLORS.low },
  moderate: { label: "Moderate", color: COURSE_FUSE_COLORS.moderate },
  high: { label: "High", color: COURSE_FUSE_COLORS.high },
  share: { label: "Department share", color: COURSE_FUSE_COLORS.moderate },
} satisfies ChartConfig;

function CourseFusedBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: {
    code?: string;
    low?: number;
    moderate?: number;
    high?: number;
  };
}) {
  if (width <= 0 || height <= 0) return null;
  const parts = [
    { value: Number(payload?.low ?? 0), color: COURSE_FUSE_COLORS.low },
    {
      value: Number(payload?.moderate ?? 0),
      color: COURSE_FUSE_COLORS.moderate,
    },
    { value: Number(payload?.high ?? 0), color: COURSE_FUSE_COLORS.high },
  ].filter((part) => part.value > 0);
  const sum = parts.reduce((total, part) => total + part.value, 0) || 1;
  const id = `course-fuse-${String(payload?.code ?? "program").replace(/[^a-zA-Z0-9]/g, "")}`;
  let cursor = 0;
  const stops = parts.flatMap((part, index) => {
    const start = (cursor / sum) * 100;
    cursor += part.value;
    const end = (cursor / sum) * 100;
    const next = parts[index + 1];
    if (!next) {
      return [
        { offset: `${start}%`, color: part.color },
        { offset: "100%", color: part.color },
      ];
    }
    const blend = Math.min(6, (end - start) / 2, ((next.value / sum) * 100) / 2);
    return [
      { offset: `${start}%`, color: part.color },
      { offset: `${Math.max(end - blend, start)}%`, color: part.color },
      { offset: `${Math.min(end + blend, 100)}%`, color: next.color },
    ];
  });

  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="1" x2="0" y2="0">
          {stops.map((stop) => (
            <stop
              key={`${id}-${stop.offset}-${stop.color}`}
              offset={stop.offset}
              stopColor={stop.color}
            />
          ))}
        </linearGradient>
      </defs>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={`url(#${id})`}
      />
    </g>
  );
}

function OverviewCard({
  label,
  value,
  hint,
  tone,
  emphasize = false,
  compact = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "low" | "moderate" | "high" | "neutral";
  emphasize?: boolean;
  compact?: boolean;
}) {
  const toneClass =
    tone === "low"
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "moderate"
        ? "text-amber-800 dark:text-amber-400"
        : tone === "high"
          ? "text-orange-800 dark:text-orange-400"
          : "";

  return (
    <Card
      className={cn(
        emphasize &&
          "border-orange-300/80 bg-orange-50/70 shadow-sm dark:border-orange-900 dark:bg-orange-950/30",
        compact && "border-border/70 bg-muted/20 shadow-none"
      )}
    >
      <CardHeader
        className={cn(
          "items-center gap-1 text-center",
          compact ? "py-2" : "py-3"
        )}
      >
        {emphasize ? (
          <p className="text-[10px] font-semibold tracking-[0.14em] text-orange-800/80 uppercase dark:text-orange-300/80">
            Priority
          </p>
        ) : null}
        <CardDescription
          className={cn(
            "font-medium tracking-wide uppercase",
            compact ? "text-[10px] text-muted-foreground" : "text-xs"
          )}
        >
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "font-[family-name:var(--font-display)] font-semibold tracking-tight tabular-nums",
            compact ? "text-xl sm:text-2xl" : "text-4xl sm:text-5xl",
            toneClass
          )}
        >
          {value}
        </CardTitle>
        {hint ? (
          <p
            className={cn(
              "text-muted-foreground",
              compact ? "text-[11px]" : "text-xs sm:text-sm"
            )}
          >
            {hint}
          </p>
        ) : null}
      </CardHeader>
    </Card>
  );
}

function percentLabel(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function NextWeekMetricsCard({ holdout }: { holdout: WeekPairHoldout }) {
  const models = [
    { title: "Decision Tree", block: holdout.decisionTreeScores, matrix: holdout.decisionTree },
    { title: "Random Forest", block: holdout.randomForestScores, matrix: holdout.randomForest },
  ];
  const holdoutRows =
    holdout.decisionTree?.matrix.reduce(
      (sum, row) => sum + row.reduce((rowSum, count) => rowSum + count, 0),
      0
    ) ?? 0;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="gap-1.5">
        <CardTitle className="text-lg">Next-week model</CardTitle>
        <CardDescription>
          Week 1 scores scored against the Week 2 label.{" "}
          {holdout.pairs.toLocaleString("en-US")} pairs from{" "}
          {holdout.realRecords.toLocaleString("en-US")} real monitoring records.
          The matrix is the held-out portion, {holdoutRows.toLocaleString("en-US")} records.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-6">
        {models.map(({ title, block, matrix }) => (
          <div key={title} className="space-y-3">
            <div>
              <p className="font-medium">{title}</p>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(
                  [
                    ["Accuracy", block.accuracy],
                    ["Precision", block.precision],
                    ["Recall", block.recall],
                    ["F1-Score", block.f1],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums">
                      {percentLabel(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {matrix ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1.5 text-left font-medium" rowSpan={2}>
                        Actual
                      </th>
                      <th
                        className="border px-2 py-1.5 text-center font-medium"
                        colSpan={matrix.labels.length}
                      >
                        Predicted
                      </th>
                    </tr>
                    <tr>
                      {matrix.labels.map((label) => (
                        <th key={label} className="border px-2 py-1.5 text-center font-medium">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.matrix.map((row, rowIndex) => (
                      <tr key={matrix.labels[rowIndex]}>
                        <th className="border px-2 py-1.5 text-left font-medium">
                          {matrix.labels[rowIndex]}
                        </th>
                        {row.map((count, columnIndex) => (
                          <td
                            key={`${matrix.labels[rowIndex]}-${matrix.labels[columnIndex]}`}
                            className={cn(
                              "border px-2 py-1.5 text-center tabular-nums",
                              rowIndex === columnIndex && "font-semibold"
                            )}
                          >
                            {count}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function GuidanceDashboard({
  firstName,
  data,
  modelEvaluation,
  aiHealthy,
  metricsSource,
  showAiModelStatus = false,
  weeks,
  selectedWeek,
  validScored,
  weekVariables,
  weekPairHoldout = null,
}: {
  firstName: string;
  data: Analytics;
  modelEvaluation: ModelEvaluationSnapshot;
  aiHealthy: boolean;
  metricsSource?: AiModelStatus["metricsSource"];
  showAiModelStatus?: boolean;
  weeks: number[];
  selectedWeek: number;
  validScored: ValidScoredSummary;
  weekVariables: WeekVariableAverages[];
  weekPairHoldout?: WeekPairHoldout | null;
}) {
  const { navigate, isPending, pendingHref } = useNavigationPending();
  const [yearFilter, setYearFilter] = React.useState("all");
  const [riskBasis, setRiskBasis] = React.useState<"week" | "total">("week");
  const [variableScope, setVariableScope] = React.useState("total");
  const [variableKey, setVariableKey] = React.useState<
    (typeof VARIABLE_OPTIONS)[number]["value"]
  >("all");

  const allLow =
    data.riskOverview.find((item) => item.label === "Low")?.count ?? 0;
  const allModerate =
    data.riskOverview.find((item) => item.label === "Moderate")?.count ?? 0;
  const allHigh =
    data.riskOverview.find((item) => item.label === "High")?.count ?? 0;
  const validRecordCount =
    weekVariables.find((item) => item.week === selectedWeek)?.count ??
    data.submittedCount;

  const scoped = React.useMemo(() => {
    if (yearFilter === "all") {
      const completion =
        data.totalStudents > 0
          ? Math.round((validRecordCount / data.totalStudents) * 1000) / 10
          : 0;
      return {
        totalStudents: data.totalStudents,
        monitoredCount: validRecordCount,
        submittedCount: validRecordCount,
        pendingCount: Math.max(data.totalStudents - validRecordCount, 0),
        completionPercent: completion,
        low: allLow,
        moderate: allModerate,
        high: allHigh,
        earlyWarningCount: data.earlyWarningCount,
        nextWeekHighCount: data.nextWeekHighCount,
        week2HighCount: data.week2HighCount,
      };
    }

    const year = Number(yearFilter);
    const stats = data.yearStats.find((c) => c.year_level === year);
    const total = stats?.total ?? 0;
    const submitted = stats?.submitted ?? 0;
    const pct = (count: number) =>
      total > 0 ? Math.round((count / total) * 1000) / 10 : 0;

    return {
      totalStudents: total,
      monitoredCount: submitted,
      submittedCount: submitted,
      pendingCount: Math.max(total - submitted, 0),
      completionPercent: pct(submitted),
      low: stats?.low ?? 0,
      moderate: stats?.moderate ?? 0,
      high: stats?.high ?? 0,
      earlyWarningCount: stats?.earlyWarningCount ?? 0,
      nextWeekHighCount: stats?.nextWeekHighCount ?? 0,
      week2HighCount: stats?.week2HighCount ?? 0,
    };
  }, [yearFilter, data, allLow, allModerate, allHigh, validRecordCount]);

  const yearFilterLabel =
    yearFilter === "all"
      ? "All years"
      : (YEAR_FILTER_OPTIONS.find((o) => o.value === yearFilter)?.label ??
        `Year ${yearFilter}`);

  const riskChart = React.useMemo(() => {
    const year = yearFilter === "all" ? null : Number(yearFilter);
    if (riskBasis === "total") {
      const source =
        year == null
          ? validScored
          : (validScored.byYear.find((item) => item.year_level === year) ?? {
              total: 0,
              categories: validScored.categories.map((category) => ({
                label: category.label,
                count: 0,
                averageScore: null,
              })),
            });
      return {
        total: source.total,
        categories: source.categories.map((category) => ({
          label: category.label,
          count: category.count,
          averageScore: category.averageScore,
          percent: sharePercent(category.count, source.total),
        })),
      };
    }

    if (year == null) {
      return {
        total: data.classifiedCount,
        categories: data.riskOverview.map((item) => ({
          label: item.label,
          count: item.count,
          averageScore: item.averageScore,
          percent: sharePercent(item.count, data.classifiedCount),
        })),
      };
    }

    const stats = data.yearStats.find((item) => item.year_level === year);
    const counts = {
      Low: stats?.low ?? 0,
      Moderate: stats?.moderate ?? 0,
      High: stats?.high ?? 0,
    };
    const averages = {
      Low: stats?.lowAverage ?? null,
      Moderate: stats?.moderateAverage ?? null,
      High: stats?.highAverage ?? null,
    };
    const total = counts.Low + counts.Moderate + counts.High;
    return {
      total,
      categories: (["Low", "Moderate", "High"] as const).map((label) => ({
        label,
        count: counts[label],
        averageScore: averages[label],
        percent: sharePercent(counts[label], total),
      })),
    };
  }, [riskBasis, yearFilter, validScored, data]);

  const pieData = riskChart.categories.map((item) => ({
    ...item,
    key: item.label.toLowerCase() as "low" | "moderate" | "high",
    fill: `var(--color-${item.label.toLowerCase()})`,
  }));
  const dominantRisk = [...pieData].sort((a, b) => b.count - a.count)[0];

  const courseChartData = data.byCourse
    .flatMap((item) => {
      const total = item.count;
      if (total <= 0) return [];
      const bands = [
        { key: "low" as const, name: "Low", count: item.low },
        { key: "moderate" as const, name: "Moderate", count: item.moderate },
        { key: "high" as const, name: "High", count: item.high },
      ];
      const lead = [...bands].sort((a, b) => b.count - a.count)[0];
      const percent = (count: number) =>
        Math.round((count / total) * 1000) / 10;
      return [
        {
          code: item.code || item.label,
          label: item.label,
          total,
          low: percent(item.low),
          moderate: percent(item.moderate),
          high: percent(item.high),
          lowRatio: `${item.low}/${total}`,
          moderateRatio: `${item.moderate}/${total}`,
          highRatio: `${item.high}/${total}`,
          share:
            percent(item.low) + percent(item.moderate) + percent(item.high),
          leadName: lead.name,
          leadRatio: `${lead.count}/${total}`,
          attention: lead.count / total,
        },
      ];
    })
    .sort((a, b) => b.attention - a.attention || a.code.localeCompare(b.code));

  const highestCourse = courseChartData[0] ?? null;

  const highestCourseSummary = highestCourse
    ? `Most attention: ${highestCourse.code}${
        highestCourse.label !== highestCourse.code
          ? ` · ${highestCourse.label}`
          : ""
      } · ${highestCourse.leadName} ${highestCourse.leadRatio}`
    : null;

  const filteredHighRisk =
    yearFilter === "all"
      ? data.highRiskStudents
      : data.highRiskStudents.filter(
          (s) => s.year_level === Number(yearFilter)
        );

  const filteredEarlyWarning =
    yearFilter === "all"
      ? data.earlyWarningStudents
      : data.earlyWarningStudents.filter(
          (s) => s.year_level === Number(yearFilter)
        );

  const {
    page: highRiskPage,
    pageSize: highRiskPageSize,
    totalItems: highRiskTotal,
    pageItems: highRiskPageItems,
    setPage: setHighRiskPage,
    setPageSize: setHighRiskPageSize,
  } = useTablePagination(filteredHighRisk, 10);

  React.useEffect(() => {
    setHighRiskPage(1);
  }, [yearFilter, setHighRiskPage]);
  const scopedRows =
    variableScope === "total"
      ? weekVariables
      : weekVariables.filter((item) => item.week === Number(variableScope));
  const scopedRecordCount = scopedRows.reduce((sum, row) => sum + row.count, 0);
  const totalRecordCount = weekVariables.reduce((sum, item) => sum + item.count, 0);
  const scopeLabel =
    variableScope === "total"
      ? `Total valid scored · ${totalRecordCount}`
      : `Week ${variableScope} · ${scopedRecordCount}`;
  const combinedLevels = (
    key: "stress" | "workload" | "study" | "sleep"
  ) =>
    scopedRows.reduce(
      (totals, row) => ({
        low: totals.low + row[key].low,
        moderate: totals.moderate + row[key].moderate,
        high: totals.high + row[key].high,
      }),
      { low: 0, moderate: 0, high: 0 }
    );
  const selectedVariable =
    VARIABLE_OPTIONS.find((item) => item.value === variableKey) ??
    VARIABLE_OPTIONS[0];
  const selectedLevels =
    selectedVariable.value === "all"
      ? { low: 0, moderate: 0, high: 0 }
      : combinedLevels(selectedVariable.value);
  const levelTotal =
    selectedLevels.low + selectedLevels.moderate + selectedLevels.high;
  const singleChartData = [
    {
      level: "Low",
      count: selectedLevels.low,
      percent: sharePercent(selectedLevels.low, levelTotal),
      fill: variableClassConfig.low.color,
    },
    {
      level: "Moderate",
      count: selectedLevels.moderate,
      percent: sharePercent(selectedLevels.moderate, levelTotal),
      fill: variableClassConfig.moderate.color,
    },
    {
      level: "High",
      count: selectedLevels.high,
      percent: sharePercent(selectedLevels.high, levelTotal),
      fill: variableClassConfig.high.color,
    },
  ];
  const allChartData = VARIABLE_OPTIONS.flatMap((item) => {
    if (item.value === "all") return [];
    const levels = combinedLevels(item.value);
    return [
      {
        variable: item.label,
        low: levels.low,
        moderate: levels.moderate,
        high: levels.high,
      },
    ];
  });
  const hasVariableChart =
    variableKey === "all"
      ? allChartData.some((item) => item.low + item.moderate + item.high > 0)
      : singleChartData.some((item) => item.count > 0);

  return (
    <div className="space-y-8">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <PageHeading
            title={`Welcome, ${firstName}`}
            description={`Administrator overview for Week ${selectedWeek} — student burnout risk, submissions, and early-warning alerts.`}
          />
        </div>

        <div className="flex w-full min-w-0 flex-col gap-3 sm:w-auto sm:flex-row">
          <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-[160px]">
            <span className="text-xs font-medium text-muted-foreground">
              Week
            </span>
            <Select
              value={String(selectedWeek)}
              onValueChange={(value) => {
                if (value == null || value === String(selectedWeek)) return;
                navigate(`/guidance?week=${value}`);
              }}
            >
              <SelectTrigger className="w-full rounded-xl" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                <SelectValue placeholder={`Week ${selectedWeek}`} />
              </SelectTrigger>
              <SelectContent>
                {weeks.map((week) => (
                  <SelectItem key={week} value={String(week)}>
                    Week {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1.5 sm:min-w-[220px] sm:w-auto">
          <span className="text-xs font-medium text-muted-foreground">
            Year Level
          </span>
          <Select
            value={yearFilter}
            onValueChange={(value) => {
              if (value == null) return;
              setYearFilter(value);
            }}
          >
            <SelectTrigger className="w-full rounded-xl sm:w-[240px]">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {YEAR_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>
      </div>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Summary totals for{" "}
          <span className="font-medium text-foreground">{yearFilterLabel}</span>
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OverviewCard
            label="High Risk"
            value={scoped.high}
            hint={`Need follow-up in Week ${selectedWeek}`}
            tone="high"
            emphasize
          />
          <AiEarlyWarningOverviewCards
            earlyWarningCount={scoped.earlyWarningCount}
            nextWeekHighCount={scoped.nextWeekHighCount}
            week2HighCount={scoped.week2HighCount}
            mode="hero"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <OverviewCard
            label="Total Students"
            value={scoped.totalStudents}
            compact
          />
          <OverviewCard
            label="Students Monitored"
            value={scoped.monitoredCount}
            hint={`Valid records in Week ${selectedWeek}`}
            compact
          />
          <OverviewCard
            label="Low Risk"
            value={scoped.low}
            tone="low"
            compact
          />
          <OverviewCard
            label="Moderate Risk"
            value={scoped.moderate}
            tone="moderate"
            compact
          />
          <OverviewCard
            label="Pending Assessments"
            value={scoped.pendingCount}
            hint={`Not submitted in Week ${selectedWeek}`}
            compact
          />
          <AiEarlyWarningOverviewCards
            earlyWarningCount={scoped.earlyWarningCount}
            nextWeekHighCount={scoped.nextWeekHighCount}
            week2HighCount={scoped.week2HighCount}
            mode="secondary"
          />
        </div>
      </section>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <Card className="flex h-full flex-col">
          <CardHeader className="gap-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">
                  Student Burnout Risk Distribution
                </CardTitle>
                <CardDescription>
                  {riskBasis === "total"
                    ? "Share of every monitoring record that has an MFBI score"
                    : `How many students need attention by predicted risk for Week ${selectedWeek}`}
                  {yearFilter !== "all"
                    ? ` · ${YEAR_FILTER_OPTIONS.find((o) => o.value === yearFilter)?.label ?? ""}`
                    : ""}
                  .
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={riskBasis === "week" ? "default" : "outline"}
                  onClick={() => setRiskBasis("week")}
                >
                  Week {selectedWeek}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={riskBasis === "total" ? "default" : "outline"}
                  onClick={() => setRiskBasis("total")}
                >
                  Total valid scored
                  {validScored.total > 0 ? ` · ${validScored.total}` : ""}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {pieData.every((item) => item.count === 0) ? (
              <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                No monitoring data yet.
              </p>
            ) : (
              <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex w-full flex-col gap-2 sm:w-[46%] sm:shrink-0">
                  <ChartContainer
                    config={riskConfig}
                    className="aspect-auto mx-auto h-[220px] w-full max-w-full"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent nameKey="key" hideLabel />
                        }
                      />
                      <Pie
                        data={pieData}
                        dataKey="count"
                        nameKey="key"
                        innerRadius={52}
                        outerRadius={78}
                        strokeWidth={2}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.key} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  {dominantRisk && dominantRisk.count > 0 ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Largest group:{" "}
                      <span className="font-medium text-foreground">
                        {dominantRisk.percent.toFixed(2)}% {dominantRisk.label}{" "}
                        Risk
                      </span>{" "}
                      ({dominantRisk.count}
                      {dominantRisk.averageScore == null
                        ? ""
                        : `, MFBI ${dominantRisk.averageScore.toFixed(2)}`}
                      )
                    </p>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="text-sm text-muted-foreground">
                    {riskBasis === "total"
                      ? "Total valid scored"
                      : `Week ${selectedWeek} scored`}
                    :{" "}
                    <span className="font-medium text-foreground">
                      {riskChart.total}
                    </span>
                  </p>
                  {pieData.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                          className="size-2.5 rounded-[2px]"
                          style={{ background: riskConfig[item.key].color }}
                        />
                        {item.label} Risk
                      </p>
                      <p className="font-medium tabular-nums">
                        {item.count}{" "}
                        <span className="font-normal text-muted-foreground">
                          · {item.percent.toFixed(2)}%
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        MFBI{" "}
                        <span className="font-medium text-foreground tabular-nums">
                          {item.averageScore == null
                            ? "—"
                            : item.averageScore.toFixed(2)}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col">
          <CardHeader className="gap-1.5">
            <CardTitle className="text-lg">
              Burnout by Program / Course
            </CardTitle>
            <CardDescription>
              Each bar is that risk count over the department total. Every
              program stays on the chart, including those not yet above half.
              {highestCourseSummary ? (
                <>
                  {" "}
                  <span className="font-medium text-foreground">
                    {highestCourseSummary}
                  </span>
                </>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 min-w-0 flex-1 flex-col px-2 sm:px-(--card-spacing)">
            {courseChartData.length === 0 ? (
              <p className="flex min-h-56 flex-1 items-center justify-center text-sm text-muted-foreground">
                No program data yet.
              </p>
            ) : (
              <ChartContainer
                config={courseRiskConfig}
                className="aspect-auto h-full min-h-[280px] w-full max-w-full flex-1"
              >
                <BarChart
                  data={courseChartData}
                  margin={{ top: 8, right: 12, bottom: 8, left: 4 }}
                  barCategoryGap={12}
                >
                  <CartesianGrid
                    vertical={false}
                    strokeDasharray="4 4"
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="code"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval={0}
                    angle={-40}
                    textAnchor="end"
                    height={72}
                  />
                  <YAxis
                    type="number"
                    domain={[0, 100]}
                    allowDecimals={false}
                    tickFormatter={(value) => `${value}%`}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    width={48}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      const row = payload?.[0]?.payload as
                        | {
                            code?: string;
                            label?: string;
                            lowRatio?: string;
                            moderateRatio?: string;
                            highRatio?: string;
                          }
                        | undefined;
                      if (!active || !row) return null;
                      return (
                        <div className="grid min-w-32 gap-1 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
                          <p className="font-medium">
                            {row.code || row.label}
                          </p>
                          <p>Low {row.lowRatio}</p>
                          <p>Moderate {row.moderateRatio}</p>
                          <p>High {row.highRatio}</p>
                        </div>
                      );
                    }}
                  />
                  <ChartLegend
                    content={() => (
                      <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs">
                        {(
                          [
                            ["low", "Low"],
                            ["moderate", "Moderate"],
                            ["high", "High"],
                          ] as const
                        ).map(([key, label]) => (
                          <div key={key} className="flex items-center gap-1.5">
                            <span
                              className="size-2.5 rounded-[2px]"
                              style={{ background: COURSE_FUSE_COLORS[key] }}
                            />
                            {label}
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  <Bar
                    dataKey="share"
                    fill="var(--color-share)"
                    maxBarSize={56}
                    shape={CourseFusedBar}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div
        className={cn(
          "grid items-stretch gap-4",
          weekPairHoldout && "lg:grid-cols-2"
        )}
      >
      <Card className="flex h-full flex-col">
        <CardHeader className="gap-1.5">
          <CardTitle className="text-lg">
            Stress, Workload, Study Time, and Sleep
          </CardTitle>
          <CardDescription>
            {selectedVariable.value === "all"
              ? `Low, Moderate, and High counts for ${scopeLabel}.`
              : `${selectedVariable.short} · ${selectedVariable.label}. Low, Moderate, and High counts for ${scopeLabel}.`}
          </CardDescription>
          <div className="flex flex-col gap-2 sm:flex-row">
          <Select
            items={{
              total: `Total valid scored · ${totalRecordCount}`,
              ...Object.fromEntries(
                weekVariables.map((item) => [
                  String(item.week),
                  `Week ${item.week} · ${item.count}`,
                ])
              ),
            }}
            value={variableScope}
            onValueChange={(value) => {
              if (value == null) return;
              setVariableScope(value);
            }}
          >
            <SelectTrigger className="w-full rounded-xl sm:w-[240px]">
              <SelectValue placeholder={scopeLabel}>{scopeLabel}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="total">
                Total valid scored · {totalRecordCount}
              </SelectItem>
              {weekVariables.map((item) => (
                <SelectItem key={item.week} value={String(item.week)}>
                  Week {item.week} · {item.count}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            items={Object.fromEntries(
              VARIABLE_OPTIONS.map((item) => [item.value, item.short])
            )}
            value={variableKey}
            onValueChange={(value) => {
              if (
                value !== "all" &&
                value !== "stress" &&
                value !== "workload" &&
                value !== "study" &&
                value !== "sleep"
              ) {
                return;
              }
              setVariableKey(value);
            }}
          >
            <SelectTrigger className="w-full rounded-xl sm:w-[120px]">
              <SelectValue placeholder={selectedVariable.short}>
                {selectedVariable.short}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {VARIABLE_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.short}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col space-y-4">
          {hasVariableChart && variableKey === "all" ? (
            <>
            <ChartContainer
              key={`${variableScope}-all`}
              config={variableClassConfig}
              className="aspect-auto h-full min-h-[280px] w-full max-w-full flex-1"
            >
              <BarChart
                data={allChartData}
                margin={{ top: 8, right: 12, bottom: 8, left: 4 }}
                barCategoryGap={28}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="4 4"
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="variable"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={40}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => {
                        const count = Number(value);
                        const key = String(name);
                        const label =
                          variableClassConfig[
                            key as keyof typeof variableClassConfig
                          ]?.label ?? key;
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-mono font-medium text-foreground tabular-nums">
                              {exactShare(count, scopedRecordCount)}
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="low"
                  fill="var(--color-low)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                />
                <Bar
                  dataKey="moderate"
                  fill="var(--color-moderate)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                />
                <Bar
                  dataKey="high"
                  fill="var(--color-high)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={22}
                />
              </BarChart>
            </ChartContainer>
            </>
          ) : hasVariableChart ? (
            <>
            <div className="grid grid-cols-3 pl-[44px] pr-3 text-center">
              {singleChartData.map((item) => (
                <div key={item.level} className="px-1">
                  <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="size-2.5 rounded-[2px]"
                      style={{ background: item.fill }}
                    />
                    {item.level}
                  </p>
                  <p className="font-medium tabular-nums">
                    {exactShare(item.count, levelTotal)}
                  </p>
                </div>
              ))}
            </div>
            <ChartContainer
              key={`${variableScope}-${variableKey}`}
              config={variableClassConfig}
              className="aspect-auto h-full min-h-[280px] w-full max-w-full flex-1"
            >
              <BarChart
                data={singleChartData}
                margin={{ top: 8, right: 12, bottom: 8, left: 4 }}
                barCategoryGap={28}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="4 4"
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="level"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={40}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="level"
                      formatter={(value, _name, item) => {
                        const row = item.payload as {
                          level?: string;
                          percent?: number;
                        };
                        return (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="text-muted-foreground">
                              {row.level}
                            </span>
                            <span className="font-mono font-medium text-foreground tabular-nums">
                              {exactShare(Number(value), levelTotal)}
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={72}>
                  {singleChartData.map((entry) => (
                    <Cell key={entry.level} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            </>
          ) : (
            <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              No valid scored records for Week 1 or Week 2 yet.
            </p>
          )}
        </CardContent>
      </Card>
      {weekPairHoldout ? <NextWeekMetricsCard holdout={weekPairHoldout} /> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangleIcon className="size-4 text-orange-700 dark:text-orange-400" />
            High-Risk Students Requiring Attention
          </CardTitle>
          <CardDescription>
            Early warning list for timely guidance intervention.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredHighRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No high-risk students for Week {selectedWeek}
              {yearFilter !== "all" ? " in the selected year level" : ""}.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Student</th>
                      <th className="px-2 py-1.5 font-medium">Program</th>
                      <th className="px-2 py-1.5 font-medium">Risk</th>
                      <th className="px-2 py-1.5 font-medium">MFBI</th>
                      <th className="px-2 py-1.5 font-medium">Last Assessment</th>
                      <th className="px-2 py-1.5 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highRiskPageItems.map((student) => {
                      const href = `/guidance/monitoring/${student.id}`;
                      const loading = isPending && pendingHref === href;
                      return (
                        <tr key={student.id} className="border-b last:border-0">
                          <td className="px-2 py-1.5">
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.student_number || "—"}
                            </p>
                          </td>
                          <td className="px-2 py-1.5">
                            {student.course || "—"}
                            {student.year_level != null
                              ? ` · ${formatYearLevel(student.year_level)}`
                              : ""}
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900 dark:bg-orange-950 dark:text-orange-200">
                              {student.risk}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 tabular-nums">
                            {student.mfbi_score != null
                              ? student.mfbi_score.toFixed(2)
                              : "—"}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {student.monitoring_date
                              ? formatDateTime(student.monitoring_date)
                              : "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={loading}
                              onClick={() => navigate(href)}
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="animate-spin" />
                                  Loading…
                                </>
                              ) : (
                                "View"
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={highRiskPage}
                pageSize={highRiskPageSize}
                totalItems={highRiskTotal}
                onPageChange={setHighRiskPage}
                onPageSizeChange={setHighRiskPageSize}
                pageSizeOptions={[10]}
                id="high-risk-students-rows"
                className="justify-end"
              />
            </>
          )}
        </CardContent>
      </Card>

      <AiEarlyWarningStudentsCard
        students={filteredEarlyWarning.map((s) => ({
          id: s.id,
          full_name: s.full_name,
          student_number: s.student_number,
          course: s.course,
          year_level: s.year_level,
          mfbi_score: s.mfbi_score,
          current_risk: s.current_risk,
          next_week_risk: s.next_week_risk,
          week2_risk: s.week2_risk,
          trend: s.trend,
        }))}
      />

      {showAiModelStatus ? (
        <AiModelStatusCard
          modelEvaluation={modelEvaluation}
          aiHealthy={aiHealthy}
          metricsSource={metricsSource}
        />
      ) : null}
    </div>
  );
}
