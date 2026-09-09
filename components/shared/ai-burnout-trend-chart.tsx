"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { riskLevelToChartScore } from "@/components/shared/risk-display";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import { FIRST_WEEK_BASELINE_MFBI } from "@/lib/student/first-week-baseline";

const chartConfig = {
  average: { label: "Avg MFBI", color: "#2563eb" },
  projection: { label: "AI projection", color: "#b45309" },
} satisfies ChartConfig;

type WeeklyPoint = {
  week: number;
  average: number;
  count?: number;
};

type EarlyWarningRow = {
  next_week_risk?: string | null;
  week2_risk?: string | null;
  year_level?: number | null;
};

type TrendRange = "4w" | "8w" | "all";

const TREND_RANGE_OPTIONS: { id: TrendRange; label: string }[] = [
  { id: "4w", label: "4 weeks" },
  { id: "8w", label: "8 weeks" },
  { id: "all", label: "All" },
];

const TREND_RANGE_DESCRIPTION: Record<TrendRange, string> = {
  "4w": "Base reference, average MFBI for the last 4 weeks, plus AI outlook.",
  "8w": "Base reference, average MFBI for the last 8 weeks, plus AI outlook.",
  all: "Base reference, average burnout score (MFBI) by week, plus AI outlook.",
};

function averageProjectedScore(
  rows: EarlyWarningRow[],
  key: "next_week_risk" | "week2_risk"
) {
  const scores = rows
    .map((row) => riskLevelToChartScore(row[key]))
    .filter((value): value is number => value != null);
  if (!scores.length) return null;
  return (
    Math.round(
      (scores.reduce((sum, value) => sum + value, 0) / scores.length) * 100
    ) / 100
  );
}

function seriesLabel(name: unknown) {
  return name === "projection" ? "AI projection" : "Avg MFBI";
}

export function AiBurnoutTrendChart({
  weeklyTrends,
  earlyWarningStudents = [],
  emptyMessage = "No weekly trend yet.",
  title = "AI Burnout Trend",
  className,
}: {
  weeklyTrends: WeeklyPoint[];
  earlyWarningStudents?: EarlyWarningRow[];
  emptyMessage?: string;
  title?: string;
  className?: string;
}) {
  const [range, setRange] = useState<TrendRange>("all");
  const visibleTrends = useMemo(() => {
    const window = range === "4w" ? 4 : range === "8w" ? 8 : weeklyTrends.length;
    return weeklyTrends.slice(-window);
  }, [weeklyTrends, range]);

  const nextScore = averageProjectedScore(
    earlyWarningStudents,
    "next_week_risk"
  );
  const week2Score = averageProjectedScore(earlyWarningStudents, "week2_risk");
  const hasProjection = nextScore != null || week2Score != null;
  const latest = visibleTrends[visibleTrends.length - 1];

  type ChartPoint = {
    weekLabel: string;
    average: number | null;
    projection: number | null;
    kind: "baseline" | "actual" | "next" | "week2";
  };

  const includesHistoryStart =
    visibleTrends.length > 0 &&
    weeklyTrends.length > 0 &&
    visibleTrends[0]?.week === weeklyTrends[0]?.week;

  const chartData: ChartPoint[] = [];

  if (includesHistoryStart) {
    chartData.push({
      weekLabel: "Base",
      average: FIRST_WEEK_BASELINE_MFBI,
      projection: null,
      kind: "baseline",
    });
  }

  visibleTrends.forEach((point, index) => {
    const isCurrent = index === visibleTrends.length - 1;
    const average = Number(point.average.toFixed(2));
    chartData.push({
      weekLabel: isCurrent ? "Current" : `Week ${point.week}`,
      average,
      projection: isCurrent && hasProjection ? average : null,
      kind: "actual",
    });
  });

  if (nextScore != null) {
    chartData.push({
      weekLabel: "Next",
      average: null,
      projection: nextScore,
      kind: "next",
    });
  }

  if (week2Score != null) {
    chartData.push({
      weekLabel: "W+2",
      average: null,
      projection: week2Score,
      kind: "week2",
    });
  }

  const showDots = chartData.length <= 12;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{TREND_RANGE_DESCRIPTION[range]}</CardDescription>
        <CardAction>
          <div className="flex rounded-lg border border-border p-0.5">
            {TREND_RANGE_OPTIONS.map((option) => (
              <Button
                key={option.id}
                type="button"
                size="xs"
                variant={range === option.id ? "secondary" : "ghost"}
                aria-pressed={range === option.id}
                onClick={() => setRange(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        {chartData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
            initialDimension={{ width: 640, height: 250 }}
          >
            <LineChart
              key={range}
              accessibilityLayer
              data={chartData}
              margin={{
                left: 4,
                right: 12,
                top: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <YAxis
                domain={[0, 1]}
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={40}
                tickFormatter={(value: number) => String(value)}
              />
              <XAxis
                dataKey="weekLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={range === "all" ? 24 : 0}
                interval={range === "all" ? "preserveStartEnd" : 0}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[200px]"
                    formatter={(value, name, item) => {
                      if (value == null) return null;
                      const kind = String(item?.payload?.kind ?? "actual");
                      const label =
                        kind === "baseline"
                          ? "Fixed baseline"
                          : kind === "next"
                            ? "Next-week AI outlook"
                            : kind === "week2"
                              ? "Week-2 AI outlook"
                              : kind === "actual" &&
                                  item?.payload?.weekLabel === "Current"
                                ? "Current avg MFBI"
                                : seriesLabel(name);
                      return (
                        <div className="flex w-full items-center justify-between gap-4">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-mono font-medium tabular-nums">
                            {Number(value).toFixed(2)}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                dataKey="average"
                type="monotone"
                stroke="var(--color-average)"
                strokeWidth={2}
                dot={showDots}
                connectNulls={false}
              />
              {hasProjection ? (
                <Line
                  dataKey="projection"
                  type="monotone"
                  stroke="var(--color-projection)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={showDots}
                  connectNulls
                />
              ) : null}
            </LineChart>
          </ChartContainer>
        )}
        {chartData.length > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {includesHistoryStart
              ? "Base = fixed MFBI 0.50 reference (not a monitoring week). "
              : null}
            Solid line = recorded average MFBI
            {latest ? ` (Current = Week ${latest.week})` : ""}.
            {hasProjection
              ? " Dashed line = AI early-warning outlook (Next = ML next-week, W+2 = trend projection)."
              : null}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
