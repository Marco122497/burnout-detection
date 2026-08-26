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
  type ChartConfig,
} from "@/components/ui/chart";
import { riskLevelToChartScore, riskTone } from "@/components/shared/risk-display";
import type { EarlyWarningPayload } from "@/lib/student/ai-client";
import { classifyTrendDirection } from "@/lib/student/burnout-trends";
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

function formatDirectionLabel(direction: string | null | undefined) {
  if (!direction || direction === "insufficient_history") return null;
  if (direction === "increasing") return "Increasing";
  if (direction === "decreasing") return "Decreasing";
  if (direction === "stable") return "Stable";
  return direction.replaceAll("_", " ");
}

function TrendWeekCard({
  label,
  score,
  level,
  direction,
  delta,
  projected = false,
  current = false,
}: {
  label: string;
  score: number | null;
  level: string | null;
  direction?: string | null;
  delta?: number | null;
  projected?: boolean;
  current?: boolean;
}) {
  const directionLabel = formatDirectionLabel(direction);

  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2",
        projected
          ? "border-dashed border-amber-500/40 bg-amber-500/5"
          : current
            ? "border-blue-500/40 bg-blue-500/5"
            : "border-border/70"
      )}
    >
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">
            {label}
            {current ? (
              <span className="ml-1 font-semibold text-blue-700 dark:text-blue-300">
                · Current
              </span>
            ) : null}
          </p>
        </div>
        <p
          className={cn(
            "text-right text-[10px] font-semibold tracking-tight",
            directionLabel
              ? movementDeltaTone(direction)
              : "text-muted-foreground"
          )}
        >
          {directionLabel ? (
            <>
              {directionLabel}
              {delta != null ? (
                <span className="ml-0.5 tabular-nums font-medium opacity-80">
                  ({delta > 0 ? "+" : ""}
                  {delta.toFixed(2)})
                </span>
              ) : null}
            </>
          ) : (
            "—"
          )}
        </p>
        <p className="text-sm font-semibold tabular-nums">
          {formatScore(score)}
        </p>
        <p
          className={cn(
            "text-right text-[11px] font-medium",
            riskTone(level)
          )}
        >
          {level ?? "—"}
        </p>
      </div>
    </div>
  );
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
  const pointsWithMovement = visibleData.map((point, index) => {
    if (point.direction && point.direction !== "insufficient_history") {
      return point;
    }
    const previousScore = index > 0 ? visibleData[index - 1]?.score : null;
    if (point.score == null) return point;
    const direction = classifyTrendDirection(point.score, previousScore ?? null);
    const delta =
      previousScore != null
        ? Math.round((point.score - previousScore) * 100) / 100
        : null;
    return { ...point, direction, delta: point.delta ?? delta };
  });
  const recentCards = pointsWithMovement.slice(-4);
  const nextWeekLevel = earlyWarning?.next_week_risk ?? null;
  const week2Level = earlyWarning?.week2_risk ?? null;
  const nextScore =
    earlyWarning?.next_week_score ?? riskLevelToChartScore(nextWeekLevel);
  const week2Score = riskLevelToChartScore(week2Level);
  const hasProjection = nextScore != null || week2Score != null;

  const nextDirection =
    nextScore != null
      ? classifyTrendDirection(nextScore, latest?.score ?? null)
      : null;
  const nextDelta =
    nextScore != null && latest?.score != null
      ? Math.round((nextScore - latest.score) * 100) / 100
      : null;
  const week2Previous = nextScore ?? latest?.score ?? null;
  const week2Direction =
    week2Score != null
      ? classifyTrendDirection(week2Score, week2Previous)
      : null;
  const week2Delta =
    week2Score != null && week2Previous != null
      ? Math.round((week2Score - week2Previous) * 100) / 100
      : null;

  type ChartPoint = {
    week: string;
    weekLabel: string;
    weekNumber: number;
    score: number | null;
    projection: number | null;
    level: string;
    direction: string | null;
    delta: number | null;
    kind: "actual" | "next" | "week2";
    isCurrent: boolean;
  };

  const chartData: ChartPoint[] = pointsWithMovement.map((point, index) => {
    const isLast = index === pointsWithMovement.length - 1;
    return {
      week: isLast ? "Current" : `W${point.week}`,
      weekLabel: isLast ? `Week ${point.week} · Current` : `Week ${point.week}`,
      weekNumber: point.week,
      score: point.score ?? 0,
      projection: isLast && hasProjection ? (point.score ?? 0) : null,
      level: point.level ?? "—",
      direction: point.direction ?? null,
      delta: point.delta ?? null,
      kind: "actual" as const,
      isCurrent: isLast,
    };
  });

  if (nextScore != null && nextWeekLevel) {
    chartData.push({
      week: "Next",
      weekLabel: "Next week",
      weekNumber: (latest?.week ?? 0) + 1,
      score: null,
      projection: nextScore,
      level: nextWeekLevel,
      direction: nextDirection,
      delta: nextDelta,
      kind: "next",
      isCurrent: false,
    });
  }

  if (week2Score != null && week2Level) {
    chartData.push({
      week: "W+2",
      weekLabel: "Week 2",
      weekNumber: (latest?.week ?? 0) + 2,
      score: null,
      projection: week2Score,
      level: week2Level,
      direction: week2Direction,
      delta: week2Delta,
      kind: "week2",
      isCurrent: false,
    });
  }

  const showDots = chartData.length <= 12;
  const latestMovement = pointsWithMovement[pointsWithMovement.length - 1];

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
            {latestMovement?.direction &&
            latestMovement.direction !== "insufficient_history" ? (
              <div className="flex justify-end">
                <p
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold tracking-tight",
                    movementHighlight(latestMovement.direction)
                  )}
                >
                  Latest movement: {latestMovement.direction}
                  {latestMovement.delta != null ? (
                    <>
                      {" "}
                      <span
                        className={cn(
                          "font-bold tabular-nums",
                          movementDeltaTone(latestMovement.direction)
                        )}
                      >
                        ({latestMovement.delta > 0 ? "+" : ""}
                        {latestMovement.delta.toFixed(2)} MFBI)
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
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const point = payload[0]?.payload as ChartPoint | undefined;
                    if (!point) return null;
                    const displayScore =
                      point.kind === "actual" ? point.score : point.projection;
                    const directionLabel = formatDirectionLabel(point.direction);

                    return (
                      <div
                        className={cn(
                          "grid min-w-[10.5rem] grid-cols-2 gap-x-3 gap-y-0.5 rounded-lg border bg-background px-2.5 py-2 text-xs shadow-xl",
                          point.isCurrent
                            ? "border-blue-500/40"
                            : "border-border/50"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-muted-foreground">
                            {point.isCurrent
                              ? `Week ${point.weekNumber}`
                              : point.weekLabel}
                            {point.isCurrent ? (
                              <span className="ml-1 font-semibold text-blue-700 dark:text-blue-300">
                                · Current
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "text-right font-semibold tracking-tight",
                            directionLabel
                              ? movementDeltaTone(point.direction)
                              : "text-muted-foreground"
                          )}
                        >
                          {directionLabel ? (
                            <>
                              {directionLabel}
                              {point.delta != null ? (
                                <span className="ml-0.5 tabular-nums font-medium opacity-80">
                                  ({point.delta > 0 ? "+" : ""}
                                  {point.delta.toFixed(2)})
                                </span>
                              ) : null}
                            </>
                          ) : (
                            "—"
                          )}
                        </p>
                        <p className="text-sm font-semibold tabular-nums">
                          {formatScore(displayScore)}
                        </p>
                        <p
                          className={cn(
                            "text-right text-[11px] font-medium",
                            riskTone(point.level)
                          )}
                        >
                          {point.level}
                        </p>
                      </div>
                    );
                  }}
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

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {recentCards.map((point) => {
                const isCurrent = point.week === latest?.week;
                return (
                  <TrendWeekCard
                    key={point.week}
                    label={`Week ${point.week}`}
                    score={point.score}
                    level={point.level}
                    direction={point.direction}
                    delta={point.delta}
                    current={isCurrent}
                  />
                );
              })}
              <TrendWeekCard
                label="Next week"
                score={nextScore}
                level={nextWeekLevel}
                direction={nextDirection}
                delta={nextDelta}
                projected
              />
              <TrendWeekCard
                label="Week 2"
                score={week2Score}
                level={week2Level}
                direction={week2Direction}
                delta={week2Delta}
                projected
              />
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



