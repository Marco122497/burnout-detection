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
import type {
  DepartmentScoreCharts,
  LevelCounts,
} from "@/lib/guidance/monitoring";

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

function sharePercent(count: number, total: number) {
  if (!total) return 0;
  return Math.round((count / total) * 10000) / 100;
}

function exactShare(count: number, total: number) {
  return `${count.toLocaleString()} · ${sharePercent(count, total).toFixed(2)}%`;
}

function averageScore(sum: number, count: number) {
  if (!count) return null;
  return Math.round((sum / count) * 100) / 100;
}

function emptyLevels(): LevelCounts {
  return { low: 0, moderate: 0, high: 0 };
}

function addLevels(target: LevelCounts, source: LevelCounts) {
  target.low += source.low;
  target.moderate += source.moderate;
  target.high += source.high;
}

function matchesYear(
  yearLevel: number | null,
  selectedYear: number | null
) {
  return selectedYear == null || yearLevel === selectedYear;
}

export function DepartmentMonitoringCharts({
  charts,
  currentWeek,
  yearLevel,
  yearLabel,
}: {
  charts: DepartmentScoreCharts;
  currentWeek: number;
  yearLevel: number | null;
  yearLabel: string;
}) {
  const [riskBasis, setRiskBasis] = React.useState<"week" | "total">("week");
  const [variableScope, setVariableScope] = React.useState("total");
  const [variableKey, setVariableKey] = React.useState<
    (typeof VARIABLE_OPTIONS)[number]["value"]
  >("all");

  const riskRows = charts.risks.filter((row) =>
    matchesYear(row.year_level, yearLevel)
  );
  const variableRows = charts.variables.filter((row) =>
    matchesYear(row.year_level, yearLevel)
  );

  const riskChart = React.useMemo(() => {
    const source =
      riskBasis === "total"
        ? riskRows
        : riskRows.filter((row) => row.week === currentWeek);
    const totals = source.reduce(
      (sum, row) => ({
        low: sum.low + row.low,
        moderate: sum.moderate + row.moderate,
        high: sum.high + row.high,
        lowScoreSum: sum.lowScoreSum + row.lowScoreSum,
        moderateScoreSum: sum.moderateScoreSum + row.moderateScoreSum,
        highScoreSum: sum.highScoreSum + row.highScoreSum,
      }),
      {
        low: 0,
        moderate: 0,
        high: 0,
        lowScoreSum: 0,
        moderateScoreSum: 0,
        highScoreSum: 0,
      }
    );
    const total = totals.low + totals.moderate + totals.high;
    const categories = (
      [
        ["Low", totals.low, totals.lowScoreSum],
        ["Moderate", totals.moderate, totals.moderateScoreSum],
        ["High", totals.high, totals.highScoreSum],
      ] as const
    ).map(([label, count, scoreSum]) => ({
      label,
      count,
      averageScore: averageScore(scoreSum, count),
      percent: sharePercent(count, total),
      key: label.toLowerCase() as "low" | "moderate" | "high",
      fill: `var(--color-${label.toLowerCase()})`,
    }));
    return { total, categories };
  }, [riskBasis, riskRows, currentWeek]);

  const dominantRisk = [...riskChart.categories].sort(
    (left, right) => right.count - left.count
  )[0];

  const weeks = [1, 2].map((week) => {
    const rows = variableRows.filter((row) => row.week === week);
    const count = rows.reduce((sum, row) => sum + row.count, 0);
    return { week, count, rows };
  });
  const scopedWeeks =
    variableScope === "total"
      ? weeks
      : weeks.filter((item) => item.week === Number(variableScope));
  const scopedRecordCount = scopedWeeks.reduce((sum, item) => sum + item.count, 0);
  const totalRecordCount = weeks.reduce((sum, item) => sum + item.count, 0);
  const scopeLabel =
    variableScope === "total"
      ? `Total valid scored · ${totalRecordCount}`
      : `Week ${variableScope} · ${scopedRecordCount}`;

  const combinedLevels = (
    key: "stress" | "workload" | "study" | "sleep"
  ) =>
    scopedWeeks.reduce(
      (totals, week) => {
        for (const row of week.rows) addLevels(totals, row[key]);
        return totals;
      },
      emptyLevels()
    );
  const selectedVariable =
    VARIABLE_OPTIONS.find((item) => item.value === variableKey) ??
    VARIABLE_OPTIONS[0];
  const selectedLevels =
    selectedVariable.value === "all"
      ? emptyLevels()
      : combinedLevels(selectedVariable.value);
  const levelTotal =
    selectedLevels.low + selectedLevels.moderate + selectedLevels.high;
  const singleChartData = [
    {
      level: "Low",
      count: selectedLevels.low,
      fill: variableClassConfig.low.color,
    },
    {
      level: "Moderate",
      count: selectedLevels.moderate,
      fill: variableClassConfig.moderate.color,
    },
    {
      level: "High",
      count: selectedLevels.high,
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
  const yearNote = yearLevel == null ? "" : ` · ${yearLabel}`;

  return (
    <div className="grid min-w-0 items-stretch gap-4 lg:grid-cols-2">
      <Card className="flex h-full min-w-0 flex-col">
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                Student Burnout Risk Distribution
              </CardTitle>
              <CardDescription>
                {riskBasis === "total"
                  ? "Share of every valid monitoring record in your department"
                  : `How many students in your department need attention by risk for Week ${currentWeek}`}
                {yearNote}.
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={riskBasis === "week" ? "default" : "outline"}
                onClick={() => setRiskBasis("week")}
              >
                Week {currentWeek}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={riskBasis === "total" ? "default" : "outline"}
                onClick={() => setRiskBasis("total")}
              >
                Total valid scored
                {totalRecordCount > 0 ? ` · ${totalRecordCount}` : ""}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          {riskChart.categories.every((item) => item.count === 0) ? (
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
                      content={<ChartTooltipContent nameKey="key" hideLabel />}
                    />
                    <Pie
                      data={riskChart.categories}
                      dataKey="count"
                      nameKey="key"
                      innerRadius={52}
                      outerRadius={78}
                      strokeWidth={2}
                    >
                      {riskChart.categories.map((entry) => (
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
                    : `Week ${currentWeek} scored`}
                  :{" "}
                  <span className="font-medium text-foreground">
                    {riskChart.total}
                  </span>
                </p>
                {riskChart.categories.map((item) => (
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

      <Card className="flex h-full min-w-0 flex-col">
        <CardHeader className="gap-1.5">
          <CardTitle className="text-lg">
            Stress, Workload, Study Time, and Sleep
          </CardTitle>
          <CardDescription>
            {selectedVariable.value === "all"
              ? `Low, Moderate, and High counts for ${scopeLabel}${yearNote}.`
              : `${selectedVariable.short} · ${selectedVariable.label}. Low, Moderate, and High counts for ${scopeLabel}${yearNote}.`}
          </CardDescription>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              items={{
                total: `Total valid scored · ${totalRecordCount}`,
                ...Object.fromEntries(
                  weeks.map((item) => [
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
                {weeks.map((item) => (
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
            <ChartContainer
              key={`${variableScope}-all-${yearLevel ?? "all"}`}
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
                key={`${variableScope}-${variableKey}-${yearLevel ?? "all"}`}
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
                        formatter={(value, _name, item) => {
                          const row = item.payload as { level?: string };
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
    </div>
  );
}
