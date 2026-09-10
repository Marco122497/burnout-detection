"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ActivityIcon,
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
import { riskTone } from "@/components/shared/risk-display";
import type { EarlyWarningPayload } from "@/lib/student/ai-client";
import { classifyTrendDirection } from "@/lib/student/burnout-trends";
import {
  FIRST_WEEK_BASELINE_LEVEL,
  FIRST_WEEK_BASELINE_MFBI,
} from "@/lib/student/first-week-baseline";
import {
  classifyMfbiScore,
  resolveMfbiBurnoutLevel,
  type BurnoutLevel,
} from "@/lib/student/mfbi";
import {
  buildMfbiEarlyWarningMessage,
  type StudentFactors,
} from "@/lib/student/tips";
import { cn } from "@/lib/utils";

const trendChartConfig = {
  score: { label: "MFBI", color: "#2563eb" },
  nextProjection: { label: "Next week (ML)", color: "#d97706" },
  week2Projection: { label: "Week 2 trend", color: "#7c3aed" },
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

/**
 * Representative MFBI midpoint for a risk band — used only for chart
 * continuity when the model returns a class label (not a measured MFBI).
 */
function bandMidpointScore(level: string | null | undefined): number | null {
  if (level === "High" || level === "Severe") return 0.85;
  if (level === "Moderate") return 0.55;
  if (level === "Low") return 0.2;
  return null;
}

/**
 * Next-week ML returns both a class label and a probability-weighted
 * risk_score. The score is NOT MFBI, so when both exist they can disagree
 * (e.g. 0.58 with label Low). Prefer the score → MFBI band when a numeric
 * score is present; otherwise use the model class label.
 */
export function resolveNextWeekDisplay(earlyWarning: EarlyWarningPayload | null): {
  level: BurnoutLevel | null;
  /** Value shown beside the level (aligned to MFBI bands when from score). */
  score: number | null;
  fromScore: boolean;
} {
  if (!earlyWarning) {
    return { level: null, score: null, fromScore: false };
  }
  const rawScore = earlyWarning.next_week_score;
  if (rawScore != null && Number.isFinite(Number(rawScore))) {
    const score = Math.round(Number(rawScore) * 100) / 100;
    return {
      level: classifyMfbiScore(score),
      score,
      fromScore: true,
    };
  }
  const level =
    resolveMfbiBurnoutLevel(null, earlyWarning.next_week_risk) ?? null;
  return {
    level,
    score: bandMidpointScore(level),
    fromScore: false,
  };
}

export function resolveWeek2Display(earlyWarning: EarlyWarningPayload | null): {
  level: BurnoutLevel | null;
  score: number | null;
} {
  const level =
    resolveMfbiBurnoutLevel(null, earlyWarning?.week2_risk ?? null) ?? null;
  return {
    level,
    score: bandMidpointScore(level),
  };
}

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
  projected?: false | "next" | "trend";
  current?: boolean;
}) {
  const directionLabel = formatDirectionLabel(direction);

  return (
    <div
      className={cn(
        "rounded-lg border px-2.5 py-2",
        projected === "next"
          ? "border-dashed border-amber-500/50 bg-amber-500/8"
          : projected === "trend"
            ? "border-dashed border-violet-500/50 bg-violet-500/8"
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
  /** Larger icon only — no label/score card (used for Next week AI). */
  iconOnly?: boolean;
};

export function EarlyWarningOutlookStepper({ steps }: { steps: OutlookStep[] }) {
  return (
    <div className="relative px-0.5 pt-2 sm:px-2">
      <div
        aria-hidden
        className="absolute top-[calc(0.5rem+2rem)] right-[18%] left-[18%] h-px -translate-y-1/2 bg-border sm:top-[calc(0.5rem+2.25rem)]"
      />
      <ol className="relative grid grid-cols-3 items-start gap-2 sm:gap-3">
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
          const iconOnly = Boolean(step.iconOnly);

          return (
            <li
              key={step.label}
              className="flex flex-col items-center px-1 text-center sm:px-2"
            >
              <div className="relative z-10 flex h-16 w-full items-center justify-center sm:h-[4.5rem]">
                <span
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-full text-white",
                    iconOnly
                      ? "size-16 bg-amber-400 sm:size-[4.5rem] [&_svg]:size-7 sm:[&_svg]:size-8"
                      : cn(
                          "size-10 sm:size-12 [&_svg]:size-4 sm:[&_svg]:size-5",
                          outlookNodeTone(hasLevel ? step.level : null)
                        )
                  )}
                  aria-label={iconOnly ? step.label : undefined}
                >
                  <Icon />
                </span>
              </div>
              <p className="mt-3 text-sm font-semibold tracking-tight text-foreground">
                {step.label}
              </p>
              <p className="mt-1 max-w-[12rem] text-xs leading-snug text-muted-foreground">
                <span
                  className={cn(
                    "font-medium tabular-nums",
                    hasLevel ? riskTone(step.level) : "text-muted-foreground"
                  )}
                >
                  {detail}
                </span>
                {hasLevel || step.hint ? (
                  <span className="mt-1 block text-[11px] text-muted-foreground">
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
  factors,
}: {
  earlyWarning: EarlyWarningPayload | null;
  mfbiScore: number | null;
  burnoutLevel: string | null;
  factors?: StudentFactors | null;
}) {
  if (!earlyWarning && mfbiScore == null && !burnoutLevel) return null;

  const nextWeek = resolveNextWeekDisplay(earlyWarning);
  const week2 = resolveWeek2Display(earlyWarning);
  const hasMlNextWeek = Boolean(earlyWarning?.has_ml_next_week);
  const currentLevel = resolveMfbiBurnoutLevel(mfbiScore, burnoutLevel);
  const warningMessage =
    buildMfbiEarlyWarningMessage({
      factors,
      trend: earlyWarning?.trend ?? null,
      burnoutLevel: currentLevel,
    }) ?? earlyWarning?.warning_message ?? null;

  return (
    <Card>
      <CardHeader>
        <div className="mb-1">
          <span className="student-chum-pill">AI Early Detection</span>
        </div>
        <CardTitle className="text-lg">Outlook timeline</CardTitle>
        <CardDescription>
          Current MFBI, AI next-week forecast, and week-2 trend projection.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <EarlyWarningOutlookStepper
          steps={[
            {
              icon: ActivityIcon,
              label: "Current status",
              score: mfbiScore,
              level: currentLevel,
              hint: "MFBI",
            },
            {
              icon: BrainCircuitIcon,
              label: "Next week (AI)",
              score: nextWeek.score,
              level:
                nextWeek.level ??
                (hasMlNextWeek ? null : "Unavailable"),
              hint: hasMlNextWeek
                ? "AI early detection"
                : "Submit monitoring to unlock",
              iconOnly: true,
            },
            {
              icon: TrendingUpIcon,
              label: "Week 2 projection",
              score: week2.score,
              level: week2.level,
              hint: "Trend-based indicator",
            },
          ]}
        />

        {warningMessage ? (
          <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-100">
            {warningMessage}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          AI early detection supports school wellness planning and is not a
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
    const mfbiLevel = resolveMfbiBurnoutLevel(point.score, point.level);
    const normalizedPoint = {
      ...point,
      level: mfbiLevel ?? point.level,
    };
    if (normalizedPoint.direction && normalizedPoint.direction !== "insufficient_history") {
      return normalizedPoint;
    }
    const previousScore = index > 0 ? visibleData[index - 1]?.score : null;
    if (normalizedPoint.score == null) return normalizedPoint;
    const direction = classifyTrendDirection(
      normalizedPoint.score,
      previousScore ?? null
    );
    const delta =
      previousScore != null
        ? Math.round((normalizedPoint.score - previousScore) * 100) / 100
        : null;
    return {
      ...normalizedPoint,
      direction,
      delta: normalizedPoint.delta ?? delta,
    };
  });
  const recentCards = pointsWithMovement.slice(-4);
  const nextWeek = resolveNextWeekDisplay(earlyWarning);
  const week2 = resolveWeek2Display(earlyWarning);
  const nextWeekLevel = nextWeek.level;
  const week2Level = week2.level;
  const nextScore = nextWeek.score;
  const week2Score = week2.score;
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
    nextProjection: number | null;
    week2Projection: number | null;
    level: string;
    direction: string | null;
    delta: number | null;
    kind: "actual" | "baseline" | "next" | "week2";
    isCurrent: boolean;
  };

  const includesHistoryStart =
    visibleData.length > 0 && data[0]?.week === visibleData[0]?.week;

  const chartSeries = includesHistoryStart
    ? [
        {
          week: Math.max(0, (visibleData[0]?.week ?? 1) - 1),
          score: FIRST_WEEK_BASELINE_MFBI,
          level: FIRST_WEEK_BASELINE_LEVEL,
          direction: null as string | null,
          delta: null as number | null,
          isBaseline: true as const,
        },
        ...pointsWithMovement.map((point, index) => {
          if (index !== 0 || point.score == null) return point;
          const direction = classifyTrendDirection(
            point.score,
            FIRST_WEEK_BASELINE_MFBI
          );
          const delta =
            Math.round((point.score - FIRST_WEEK_BASELINE_MFBI) * 100) / 100;
          return {
            ...point,
            direction:
              point.direction && point.direction !== "insufficient_history"
                ? point.direction
                : direction,
            delta: point.delta ?? delta,
          };
        }),
      ]
    : pointsWithMovement.map((point) => ({ ...point, isBaseline: false as const }));

  const chartData: ChartPoint[] = chartSeries.map((point, index) => {
    const isBaseline = Boolean(
      "isBaseline" in point && point.isBaseline
    );
    const isLastActual = !isBaseline && index === chartSeries.length - 1;
    return {
      week: isBaseline
        ? "Base"
        : isLastActual
          ? "Current"
          : `W${point.week}`,
      weekLabel: isBaseline
        ? "Fixed baseline · 0.50"
        : isLastActual
          ? `Week ${point.week} · Current`
          : `Week ${point.week}`,
      weekNumber: point.week,
      score: point.score ?? 0,
      nextProjection:
        isLastActual && nextScore != null ? (point.score ?? 0) : null,
      week2Projection:
        isLastActual && nextScore == null && week2Score != null
          ? (point.score ?? 0)
          : null,
      level: point.level ?? "—",
      direction: point.direction ?? null,
      delta: point.delta ?? null,
      kind: isBaseline ? ("baseline" as const) : ("actual" as const),
      isCurrent: isLastActual,
    };
  });

  if (nextScore != null && nextWeekLevel) {
    chartData.push({
      week: "Next",
      weekLabel: "Next week",
      weekNumber: (latest?.week ?? 0) + 1,
      score: null,
      nextProjection: nextScore,
      week2Projection: week2Score != null ? nextScore : null,
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
      weekLabel: "Week 2 trend",
      weekNumber: (latest?.week ?? 0) + 2,
      score: null,
      nextProjection: null,
      week2Projection: week2Score,
      level: week2Level,
      direction: week2Direction,
      delta: week2Delta,
      kind: "week2",
      isCurrent: false,
    });
  }

  const showDots = chartData.length <= 12;
  const adjustedActualPoints = includesHistoryStart
    ? chartSeries.filter((point) => !("isBaseline" in point && point.isBaseline))
    : pointsWithMovement;
  const latestMovement =
    adjustedActualPoints[adjustedActualPoints.length - 1] ??
    pointsWithMovement[pointsWithMovement.length - 1];

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
                  left: 4,
                  right: 16,
                  top: 12,
                  bottom: 4,
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
                      point.kind === "actual" || point.kind === "baseline"
                        ? point.score
                        : point.kind === "next"
                          ? point.nextProjection
                          : point.week2Projection;
                    const directionLabel = formatDirectionLabel(point.direction);
                    const isNextProjection = point.kind === "next";
                    const isTrendProjection = point.kind === "week2";
                    const isBaseline = point.kind === "baseline";

                    return (
                      <div
                        className={cn(
                          "grid min-w-[10.5rem] grid-cols-2 gap-x-3 gap-y-0.5 rounded-lg border bg-background px-2.5 py-2 text-xs shadow-xl",
                          point.isCurrent
                            ? "border-blue-500/40"
                            : isNextProjection
                              ? "border-amber-500/40"
                              : isTrendProjection
                                ? "border-violet-500/40"
                                : isBaseline
                                  ? "border-slate-400/40"
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
                            ) : isBaseline ? (
                              <span className="ml-1 font-semibold text-slate-600 dark:text-slate-300">
                                · Reference
                              </span>
                            ) : isNextProjection ? (
                              <span className="ml-1 font-semibold text-amber-700 dark:text-amber-300">
                                · ML
                              </span>
                            ) : isTrendProjection ? (
                              <span className="ml-1 font-semibold text-violet-700 dark:text-violet-300">
                                · Trend
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
                {nextScore != null ? (
                  <Line
                    type="monotone"
                    dataKey="nextProjection"
                    stroke="var(--color-nextProjection)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={showDots}
                    connectNulls
                  />
                ) : null}
                {week2Score != null ? (
                  <Line
                    type="monotone"
                    dataKey="week2Projection"
                    stroke="var(--color-week2Projection)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={showDots}
                    connectNulls
                  />
                ) : null}
              </LineChart>
            </ChartContainer>

            {hasProjection || includesHistoryStart ? (
              <p className="text-[11px] text-muted-foreground">
                {includesHistoryStart ? (
                  <>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      Base
                    </span>{" "}
                    = fixed MFBI 0.50 reference (not a monitoring week).{" "}
                  </>
                ) : null}
                {hasProjection ? (
                  <>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      Blue solid
                    </span>{" "}
                    = recorded MFBI.{" "}
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      Amber dashed
                    </span>{" "}
                    = next-week ML prediction.{" "}
                    <span className="font-medium text-violet-600 dark:text-violet-400">
                      Violet dashed
                    </span>{" "}
                    = week-2 trend projection.
                  </>
                ) : null}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {recentCards.map((point) => {
                const isCurrent = point.week === latest?.week;
                const firstVisibleIsHistoryStart =
                  includesHistoryStart &&
                  point.week === visibleData[0]?.week;
                const cardPoint =
                  firstVisibleIsHistoryStart && point.score != null
                    ? {
                        ...point,
                        direction:
                          point.direction &&
                          point.direction !== "insufficient_history"
                            ? point.direction
                            : classifyTrendDirection(
                                point.score,
                                FIRST_WEEK_BASELINE_MFBI
                              ),
                        delta:
                          point.delta ??
                          Math.round(
                            (point.score - FIRST_WEEK_BASELINE_MFBI) * 100
                          ) / 100,
                      }
                    : point;
                return (
                  <TrendWeekCard
                    key={point.week}
                    label={`Week ${point.week}`}
                    score={cardPoint.score}
                    level={cardPoint.level}
                    direction={cardPoint.direction}
                    delta={cardPoint.delta}
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
                projected="next"
              />
              <TrendWeekCard
                label="Week 2 trend"
                score={week2Score}
                level={week2Level}
                direction={week2Direction}
                delta={week2Delta}
                projected="trend"
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



