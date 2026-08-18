"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BrainCircuitIcon,
  TrendingUpIcon,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

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
import { riskLevelToChartScore, riskTone } from "@/components/shared/risk-display";
import type { EarlyWarningPayload } from "@/lib/student/ai-client";
import { cn } from "@/lib/utils";

const trendChartConfig = {
  score: { label: "MFBI", color: "#2563eb" },
  projection: { label: "Projection", color: "#b45309" },
} satisfies ChartConfig;

type TrendRange = "4w" | "8w" | "all";

const TREND_RANGE_OPTIONS: { id: TrendRange; label: string }[] = [
  { id: "4w", label: "4 weeks" },
  { id: "8w", label: "8 weeks" },
  { id: "all", label: "All" },
];

const TREND_RANGE_DESCRIPTION: Record<TrendRange, string> = {
  "4w": "Weekly MFBI for the last 4 monitoring weeks, plus AI outlook.",
  "8w": "Weekly MFBI for the last 8 monitoring weeks, plus AI outlook.",
  all: "Weekly MFBI history plus next-week and week-2 early-warning projections.",
};

export type WeeklyTrendPoint = {
  week: number;
  score: number | null;
  level: string | null;
  delta?: number | null;
  direction?: string | null;
};

function formatScore(value: number | null | undefined) {
  return value != null ? value.toFixed(2) : "—";
}

function outlookNodeTone(level: string | null | undefined) {
  if (level === "High" || level === "Severe") {
    return "bg-orange-500 text-white";
  }
  if (level === "Moderate") {
    return "bg-amber-400 text-white";
  }
  if (level === "Low") {
    return "bg-emerald-500 text-white";
  }
  return "bg-muted text-muted-foreground";
}

function movementHighlight(direction: string | null | undefined) {
  if (direction === "increasing") {
    return "bg-amber-500/15 text-amber-950 dark:text-amber-100";
  }
  if (direction === "decreasing") {
    return "bg-emerald-500/15 text-emerald-950 dark:text-emerald-100";
  }
  return "bg-muted text-foreground";
}

function movementDeltaTone(direction: string | null | undefined) {
  if (direction === "increasing") {
    return "text-orange-600 dark:text-orange-400";
  }
  if (direction === "decreasing") {
    return "text-emerald-600 dark:text-emerald-400";
  }
  return "text-foreground";
}

type OutlookStep = {
  icon: LucideIcon;
  label: string;
  score: number | null;
  level: string | null;
  hint: string;
};

export function EarlyWarningOutlookStepper({ steps }: { steps: OutlookStep[] }) {
  return (
    <div className="relative px-2 pt-1 sm:px-8">
      <div
        aria-hidden
        className="absolute top-6 right-[16.5%] left-[16.5%] h-px bg-border sm:top-7"
      />
      <ol className="relative grid grid-cols-3 gap-3">
        {steps.map((step) => {
          const Icon = step.icon;
          const hasLevel =
            step.level != null &&
            ["Low", "Moderate", "High", "Severe"].includes(step.level);
          const scoreLabel =
            step.score != null ? formatScore(step.score) : null;
          const statusLabel = hasLevel
            ? step.level
            : (step.level ?? step.hint);
          const detail = [scoreLabel, statusLabel].filter(Boolean).join(" · ");

          return (
            <li key={step.label} className="flex flex-col items-center text-center">
              <span
                className={cn(
                  "relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full shadow-sm sm:size-14 [&_svg]:size-5 sm:[&_svg]:size-6",
                  outlookNodeTone(hasLevel ? step.level : null)
                )}
              >
                <Icon />
              </span>
              <p className="mt-3 text-sm font-semibold tracking-tight text-foreground">
                {step.label}
              </p>
              <p className="mt-1 max-w-[10rem] text-xs leading-snug text-muted-foreground">
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    hasLevel ? riskTone(step.level) : "text-muted-foreground"
                  )}
                >
                  {detail}
                </span>
                {hasLevel ? (
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {step.hint}
                  </span>
                ) : null}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function EarlyWarningOutlookCard({
  earlyWarning,
  mfbiScore,
  burnoutLevel,
}: {
  earlyWarning: EarlyWarningPayload | null;
  mfbiScore: number | null;
  burnoutLevel: string | null;
}) {
  if (!earlyWarning && mfbiScore == null && !burnoutLevel) return null;

  const nextWeekRisk = earlyWarning?.next_week_risk ?? null;
  const hasMlNextWeek = Boolean(earlyWarning?.has_ml_next_week);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangleIcon className="size-4" />
          Early warning outlook
        </CardTitle>
        <CardDescription>
          Current risk is from trained same-week models. Next-week uses the
          trained next-week model when history exists. Week-2 is a
          trend-based projection, not a guaranteed forecast.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <EarlyWarningOutlookStepper
          steps={[
            {
              icon: ActivityIcon,
              label: "Current status",
              score: mfbiScore,
              level: burnoutLevel,
              hint: "MFBI",
            },
            {
              icon: BrainCircuitIcon,
              label: "Next week",
              score:
                earlyWarning?.next_week_score ??
                riskLevelToChartScore(nextWeekRisk),
              level:
                nextWeekRisk ??
                (hasMlNextWeek ? null : "Need prior week"),
              hint: hasMlNextWeek ? "ML early detection" : "Awaiting history",
            },
            {
              icon: TrendingUpIcon,
              label: "Week 2 projection",
              score: riskLevelToChartScore(earlyWarning?.week2_risk),
              level: earlyWarning?.week2_risk ?? null,
              hint: "Trend-based indicator",
            },
          ]}
        />
        {earlyWarning ? (
          <p className="text-sm text-muted-foreground">
            Risk trend:{" "}
            <span className="font-medium text-foreground">
              {earlyWarning.trend.replaceAll("_", " ")}
            </span>
          </p>
        ) : null}
        {earlyWarning?.warning_message ? (
          <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-100">
            {earlyWarning.warning_message}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          This system provides educational early-warning support and is not a
          medical diagnosis.
        </p>
      </CardContent>
    </Card>
  );
}

export function BurnoutRiskTrendChart({
  data,
  earlyWarning,
  emptyMessage = "No burnout trend yet.",
  title = "Burnout risk trend",
  className,
}: {
  data: WeeklyTrendPoint[];
  earlyWarning: EarlyWarningPayload | null;
  emptyMessage?: string;
  title?: string;
  className?: string;
}) {
  const [range, setRange] = useState<TrendRange>("all");
  const visibleData = useMemo(() => {
    const window = range === "4w" ? 4 : range === "8w" ? 8 : data.length;
    return data.slice(-window);
  }, [data, range]);

  const latest = visibleData[visibleData.length - 1];
  const recentCards = visibleData.slice(-4);
  const nextWeekLevel = earlyWarning?.next_week_risk ?? null;
  const week2Level = earlyWarning?.week2_risk ?? null;
  const nextScore =
    earlyWarning?.next_week_score ?? riskLevelToChartScore(nextWeekLevel);
  const week2Score = riskLevelToChartScore(week2Level);
  const hasProjection = nextScore != null || week2Score != null;

  type ChartPoint = {
    week: string;
    weekNumber: number;
    score: number | null;
    projection: number | null;
    level: string;
    kind: "actual" | "next" | "week2";
  };

  const chartData: ChartPoint[] = visibleData.map((point, index) => {
    const isLast = index === visibleData.length - 1;
    return {
      week: `W${point.week}`,
      weekNumber: point.week,
      score: point.score ?? 0,
      projection: isLast && hasProjection ? (point.score ?? 0) : null,
      level: point.level ?? "—",
      kind: "actual" as const,
    };
  });

  if (nextScore != null && nextWeekLevel) {
    chartData.push({
      week: "Next",
      weekNumber: (latest?.week ?? 0) + 1,
      score: null,
      projection: nextScore,
      level: nextWeekLevel,
      kind: "next",
    });
  }

  if (week2Score != null && week2Level) {
    chartData.push({
      week: "W+2",
      weekNumber: (latest?.week ?? 0) + 2,
      score: null,
      projection: week2Score,
      level: week2Level,
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
      <CardContent className="space-y-4">
        {chartData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <>
            {latest?.direction && latest.direction !== "insufficient_history" ? (
              <div className="flex justify-end">
                <p
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold tracking-tight",
                    movementHighlight(latest.direction)
                  )}
                >
                  Latest movement: {latest.direction}
                  {latest.delta != null ? (
                    <>
                      {" "}
                      <span
                        className={cn(
                          "font-bold tabular-nums",
                          movementDeltaTone(latest.direction)
                        )}
                      >
                        ({latest.delta > 0 ? "+" : ""}
                        {latest.delta.toFixed(2)} MFBI)
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
            ) : null}

            <ChartContainer
              config={trendChartConfig}
              className="aspect-auto h-[250px] w-full"
              initialDimension={{ width: 640, height: 250 }}
            >
              <LineChart
                key={range}
                accessibilityLayer
                data={chartData}
                margin={{
                  left: 12,
                  right: 12,
                  top: 12,
                }}
              >
                <CartesianGrid vertical={false} />
                <YAxis
                  hide
                  domain={[0, (dataMax: number) => Math.max(dataMax * 1.25, 0.25)]}
                />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={range === "all" ? 24 : 0}
                  interval={range === "all" ? "preserveStartEnd" : 0}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      className="w-[180px]"
                      formatter={(value, name, item) => {
                        const kind = String(item?.payload?.kind ?? "actual");
                        if (value == null) return null;
                        const label =
                          kind === "next"
                            ? "Next-week projection"
                            : kind === "week2"
                              ? "Week-2 projection"
                              : name === "projection"
                                ? "Projection"
                                : "MFBI";
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
                  type="monotone"
                  dataKey="score"
                  stroke="var(--color-score)"
                  strokeWidth={2}
                  dot={showDots}
                  connectNulls={false}
                />
                {hasProjection ? (
                  <Line
                    type="monotone"
                    dataKey="projection"
                    stroke="var(--color-projection)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={showDots}
                    connectNulls
                  />
                ) : null}
              </LineChart>
            </ChartContainer>

            {hasProjection ? (
              <p className="text-[11px] text-muted-foreground">
                Solid line = recorded MFBI. Dashed line = next-week ML risk and
                week-2 trend projection (mapped to risk midpoints for charting).
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {recentCards.map((point) => (
                <div
                  key={point.week}
                  className="rounded-lg border border-border/70 px-2.5 py-2"
                >
                  <p className="text-[11px] text-muted-foreground">
                    Week {point.week}
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    {point.score != null ? point.score.toFixed(2) : "—"}
                  </p>
                  <p
                    className={cn(
                      "text-[11px] font-medium",
                      riskTone(point.level)
                    )}
                  >
                    {point.level ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function BurnoutRiskTrendCard({
  data,
  earlyWarning,
  emptyMessage,
}: {
  data: WeeklyTrendPoint[];
  earlyWarning: EarlyWarningPayload | null;
  emptyMessage?: string;
}) {
  return (
    <BurnoutRiskTrendChart
      data={data}
      earlyWarning={earlyWarning}
      emptyMessage={emptyMessage}
    />
  );
}
