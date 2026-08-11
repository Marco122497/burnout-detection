"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ActivityIcon,
  AlertTriangleIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  HeartPulseIcon,
  LightbulbIcon,
  MegaphoneIcon,
  TrendingUpIcon,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import type { Profile } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/auth/roles";
import type { StudentDashboardData } from "@/lib/student/dashboard";
import {
  BurnoutFactorSection,
  BurnoutHero,
} from "@/components/shared/burnout-summary";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const trendChartConfig = {
  score: { label: "MFBI", color: "var(--primary)" },
  projection: { label: "Projection", color: "oklch(0.72 0.14 55)" },
} satisfies ChartConfig;

function riskTone(level: string | null | undefined) {
  if (level === "High" || level === "Severe") return "text-red-700 dark:text-red-400";
  if (level === "Moderate") return "text-amber-700 dark:text-amber-400";
  if (level === "Low") return "text-emerald-700 dark:text-emerald-400";
  return "text-muted-foreground";
}

/** Representative MFBI for charting risk-level projections (not measured scores). */
function riskLevelToChartScore(level: string | null | undefined) {
  if (level === "High" || level === "Severe") return 0.85;
  if (level === "Moderate") return 0.55;
  if (level === "Low") return 0.2;
  return null;
}

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

type OutlookStep = {
  icon: LucideIcon;
  label: string;
  score: number | null;
  level: string | null;
  hint: string;
};

function EarlyWarningOutlookStepper({ steps }: { steps: OutlookStep[] }) {
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

function TrendChart({
  data,
  earlyWarning,
}: {
  data: StudentDashboardData["weeklyTrend"];
  earlyWarning: StudentDashboardData["earlyWarning"];
}) {
  if (!data.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        No burnout trend yet. Submit weekly monitoring to start tracking.
      </div>
    );
  }

  const latest = data[data.length - 1];
  const recentCards = data.slice(-4);
  const nextWeekLevel = earlyWarning?.next_week_risk ?? null;
  const week2Level = earlyWarning?.week2_risk ?? null;
  const nextScore = riskLevelToChartScore(nextWeekLevel);
  const week2Score = riskLevelToChartScore(week2Level);
  const hasProjection = nextScore != null || week2Score != null;

  type ChartPoint = {
    week: string;
    weekNumber: number;
    score: number | null;
    projection: number | null;
    level: string;
    kind: "actual" | "next" | "week2";
    delta: number | null;
    direction: string | null;
  };

  const chartData: ChartPoint[] = data.map((point, index) => {
    const isLast = index === data.length - 1;
    return {
      week: `W${point.week}`,
      weekNumber: point.week,
      score: point.score ?? 0,
      projection: isLast && hasProjection ? (point.score ?? 0) : null,
      level: point.level ?? "—",
      kind: "actual" as const,
      delta: point.delta ?? null,
      direction: point.direction ?? null,
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
      delta: null,
      direction: null,
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
      delta: null,
      direction: null,
    });
  }

  return (
    <div className="space-y-4">
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

      <ChartContainer config={trendChartConfig} className="h-48 w-full">
        <LineChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="week" tickLine={false} axisLine={false} />
          <YAxis
            domain={[0, 1]}
            tickLine={false}
            axisLine={false}
            width={32}
            tickFormatter={(value) => Number(value).toFixed(1)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => {
                  const level = String(item?.payload?.level ?? "—");
                  const kind = String(item?.payload?.kind ?? "actual");
                  if (value == null) return null;
                  const label =
                    kind === "next"
                      ? "Next-week projection"
                      : kind === "week2"
                        ? "Week-2 projection"
                        : name === "projection"
                          ? "Projection link"
                          : "MFBI";
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span>
                        {label}: {Number(value).toFixed(2)}
                      </span>
                      <span className={cn("text-xs", riskTone(level))}>
                        {level} risk
                        {kind !== "actual" ? " (projected)" : ""}
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--color-score)"
            strokeWidth={2.5}
            dot={{ r: 4 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
          {hasProjection ? (
            <Line
              type="monotone"
              dataKey="projection"
              stroke="var(--color-projection)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ) : null}
        </LineChart>
      </ChartContainer>

      {hasProjection ? (
        <p className="text-[11px] text-muted-foreground">
          Solid line = recorded MFBI. Dashed line = next-week ML risk and week-2
          trend projection (mapped to risk midpoints for charting).
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {recentCards.map((point) => (
          <div
            key={point.week}
            className="rounded-lg border border-border/70 px-2.5 py-2"
          >
            <p className="text-[11px] text-muted-foreground">Week {point.week}</p>
            <p className="text-sm font-semibold tabular-nums">
              {point.score != null ? point.score.toFixed(2) : "—"}
            </p>
            <p className={cn("text-[11px] font-medium", riskTone(point.level))}>
              {point.level ?? "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
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

export function StudentDashboard({
  profile,
  data,
}: {
  profile: Profile;
  data: StudentDashboardData;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Welcome, {profile.first_name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your burnout risk and weekly monitoring status.
        </p>
      </div>

      <BurnoutHero
        level={data.burnoutLevel}
        mfbiScore={data.mfbiScore}
        weekLabel={data.latestWeek != null ? `Week ${data.latestWeek}` : null}
      >
        <div className="space-y-1 pt-1 text-xs text-muted-foreground">
          {data.decisionTreePrediction != null ||
          data.randomForestPrediction != null ? (
            <p>
              DT: {data.decisionTreePrediction ?? "—"}
              {data.decisionTreeConfidence != null
                ? ` (${data.decisionTreeConfidence}%)`
                : ""}
              {data.selectedModel === "Decision Tree" ? " · selected" : ""}{" "}
              RF: {data.randomForestPrediction ?? "—"}
              {data.randomForestConfidence != null
                ? ` (${data.randomForestConfidence}%)`
                : ""}
              {data.selectedModel === "Random Forest" ? " · selected" : ""}
            </p>
          ) : data.modelConfidence != null ? (
            <p>
              Prediction confidence: {data.modelConfidence}%
              {data.selectedModel === "Decision Tree"
                ? " · DT"
                : data.selectedModel === "Random Forest"
                  ? " · RF"
                  : data.selectedModel
                    ? ` · ${data.selectedModel}`
                    : ""}
            </p>
          ) : null}
          {data.predictionDate ? (
            <p>Predicted: {formatDateTime(data.predictionDate)}</p>
          ) : null}
        </div>
        {data.monitoringStatus === "Pending" ? (
          <Link
            href="/student/monitoring"
            className={cn(buttonVariants({ size: "sm" }), "mt-1 w-full")}
          >
            <HeartPulseIcon />
            Complete Week {data.currentWeek ?? "—"} monitoring
          </Link>
        ) : (
          <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            <CheckCircle2Icon className="size-3.5 text-emerald-600" />
            {data.monitoringStatus === "Submitted"
              ? `Week ${data.currentWeek ?? "—"} monitoring submitted`
              : `Week ${data.currentWeek ?? "—"} monitoring is closed`}
          </p>
        )}
      </BurnoutHero>

      <BurnoutFactorSection
        factors={data.factors}
        stressLevel={data.stressLevel}
        heading="What makes up your burnout score"
        subheading="Your burnout index combines these four factors from your latest weekly monitoring."
      />

      {data.earlyWarning ? (
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
                  score: data.mfbiScore,
                  level: data.burnoutLevel,
                  hint: "MFBI",
                },
                {
                  icon: BrainCircuitIcon,
                  label: "Next week",
                  score:
                    data.earlyWarning.next_week_score ??
                    riskLevelToChartScore(data.earlyWarning.next_week_risk),
                  level:
                    data.earlyWarning.next_week_risk ??
                    (data.earlyWarning.has_ml_next_week
                      ? null
                      : "Need prior week"),
                  hint: data.earlyWarning.has_ml_next_week
                    ? "ML early detection"
                    : "Awaiting history",
                },
                {
                  icon: TrendingUpIcon,
                  label: "Week 2 projection",
                  score: riskLevelToChartScore(data.earlyWarning.week2_risk),
                  level: data.earlyWarning.week2_risk,
                  hint: "Trend-based indicator",
                },
              ]}
            />
            <p className="text-sm text-muted-foreground">
              Risk trend:{" "}
              <span className="font-medium text-foreground">
                {data.earlyWarning.trend.replaceAll("_", " ")}
              </span>
            </p>
            {data.earlyWarning.warning_message ? (
              <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-950 dark:text-amber-100">
                {data.earlyWarning.warning_message}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              This system provides educational early-warning support and is not
              a medical diagnosis.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Burnout risk trend</CardTitle>
            <CardDescription>
              Weekly MFBI history plus next-week and week-2 early-warning
              projections on the chart.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart
              data={data.weeklyTrend}
              earlyWarning={data.earlyWarning}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LightbulbIcon className="size-4" />
              Counseling recommendation
            </CardTitle>
            <CardDescription>
              Guidance tip matched to your current risk level.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recommendation ? (
              <>
                <p className="text-sm font-medium">{data.recommendation.title}</p>
                <p className="text-sm text-muted-foreground">
                  {data.recommendation.description}
                </p>
                {data.recommendation.recommended_action ? (
                  <p className="text-sm text-muted-foreground">
                    Action: {data.recommendation.recommended_action}
                  </p>
                ) : null}
                <Link
                  href="/student/recommendations"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" })
                  )}
                >
                  View recommendations
                </Link>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Recommendations appear after your first assessment result.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MegaphoneIcon className="size-4" />
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.announcements.length ? (
            data.announcements.map((item) => (
              <div
                key={item.announcement_id}
                className="border-b border-border/70 pb-3 last:border-0 last:pb-0"
              >
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {item.content}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(item.created_at)}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No announcements yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
