"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { riskLevelToChartScore, riskTone } from "@/components/shared/risk-display";
import { cn } from "@/lib/utils";

const chartConfig = {
  average: { label: "Avg MFBI", color: "var(--primary)" },
  projection: { label: "AI projection", color: "oklch(0.72 0.14 55)" },
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

export function AiBurnoutTrendChart({
  weeklyTrends,
  earlyWarningStudents = [],
  emptyMessage = "No weekly trend yet.",
  className,
}: {
  weeklyTrends: WeeklyPoint[];
  earlyWarningStudents?: EarlyWarningRow[];
  emptyMessage?: string;
  className?: string;
}) {
  if (!weeklyTrends.length) {
    return (
      <p className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const latest = weeklyTrends[weeklyTrends.length - 1];
  const nextScore = averageProjectedScore(
    earlyWarningStudents,
    "next_week_risk"
  );
  const week2Score = averageProjectedScore(earlyWarningStudents, "week2_risk");
  const hasProjection = nextScore != null || week2Score != null;

  type ChartPoint = {
    weekLabel: string;
    average: number | null;
    projection: number | null;
    level?: string;
    kind: "actual" | "next" | "week2";
  };

  const chartData: ChartPoint[] = weeklyTrends.map((point, index) => {
    const isLast = index === weeklyTrends.length - 1;
    return {
      weekLabel: `Week ${point.week}`,
      average: Number(point.average.toFixed(2)),
      projection: isLast && hasProjection ? Number(point.average.toFixed(2)) : null,
      kind: "actual",
    };
  });

  if (nextScore != null) {
    chartData.push({
      weekLabel: "Next",
      average: null,
      projection: nextScore,
      level: "Next-week ML",
      kind: "next",
    });
  }

  if (week2Score != null) {
    chartData.push({
      weekLabel: "W+2",
      average: null,
      projection: week2Score,
      level: "Week-2 trend",
      kind: "week2",
    });
  }

  return (
    <div className={cn("space-y-2", className)}>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[250px] w-full max-w-full"
      >
        <LineChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="weekLabel"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            domain={[0, 1]}
            tickLine={false}
            axisLine={false}
            width={36}
            tickFormatter={(value) => Number(value).toFixed(1)}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => {
                  if (value == null) return null;
                  const kind = String(item?.payload?.kind ?? "actual");
                  const label =
                    kind === "next"
                      ? "Next-week AI outlook"
                      : kind === "week2"
                        ? "Week-2 AI outlook"
                        : name === "projection"
                          ? "Projection link"
                          : "Avg MFBI";
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span>
                        {label}: {Number(value).toFixed(2)}
                      </span>
                      {kind !== "actual" ? (
                        <span className={cn("text-xs", riskTone("Moderate"))}>
                          Projected cohort outlook
                        </span>
                      ) : null}
                    </div>
                  );
                }}
              />
            }
          />
          <Line
            dataKey="average"
            type="monotone"
            stroke="var(--color-average)"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
          {hasProjection ? (
            <Line
              dataKey="projection"
              type="monotone"
              stroke="var(--color-projection)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ) : null}
        </LineChart>
      </ChartContainer>
      {hasProjection ? (
        <p className="text-[11px] text-muted-foreground">
          Solid line = recorded average MFBI
          {latest ? ` (latest Week ${latest.week})` : ""}. Dashed line = AI
          early-warning outlook (Next = ML next-week, W+2 = trend projection).
        </p>
      ) : null}
    </div>
  );
}
