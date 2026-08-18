"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

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

const trendConfig = {
  low: { label: "Low Risk", color: "#0d9488" },
  moderate: { label: "Moderate Risk", color: "#2563eb" },
  high: { label: "High Risk", color: "#b45309" },
} satisfies ChartConfig;

type TrendRange = "4w" | "8w" | "all";

const TREND_RANGE_OPTIONS: { id: TrendRange; label: string }[] = [
  { id: "4w", label: "4 weeks" },
  { id: "8w", label: "8 weeks" },
  { id: "all", label: "All" },
];

const TREND_RANGE_DESCRIPTION: Record<TrendRange, string> = {
  "4w": "Students in each risk level for the last 4 monitoring weeks.",
  "8w": "Students in each risk level for the last 8 monitoring weeks.",
  all: "Number of students in each risk level by monitoring week.",
};

export type WeeklyRiskTrendPoint = {
  weekLabel: string;
  low: number;
  moderate: number;
  high: number;
};

function trendLabel(name: unknown) {
  if (name === "low") return "Low Risk";
  if (name === "moderate") return "Moderate Risk";
  return "High Risk";
}

export function WeeklyBurnoutRiskTrendChart({
  data,
  title = "Weekly Burnout Risk Trend",
  className,
}: {
  data: WeeklyRiskTrendPoint[];
  title?: string;
  className?: string;
}) {
  const [range, setRange] = useState<TrendRange>("all");
  const chartData = useMemo(() => {
    const window = range === "4w" ? 4 : range === "8w" ? 8 : data.length;
    return data.slice(-window);
  }, [data, range]);

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
      <CardContent>
        {chartData.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No weekly trend yet.
          </p>
        ) : (
          <ChartContainer
            config={trendConfig}
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
                domain={[0, (dataMax: number) => Math.max(dataMax * 1.25, 1)]}
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
                    className="w-[180px]"
                    formatter={(value, name) => (
                      <div className="flex w-full items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {trendLabel(name)}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {typeof value === "number" ? value : Number(value)}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                dataKey="low"
                type="monotone"
                stroke="var(--color-low)"
                strokeWidth={2}
                dot={chartData.length <= 12}
              />
              <Line
                dataKey="moderate"
                type="monotone"
                stroke="var(--color-moderate)"
                strokeWidth={2}
                dot={chartData.length <= 12}
              />
              <Line
                dataKey="high"
                type="monotone"
                stroke="var(--color-high)"
                strokeWidth={2}
                dot={chartData.length <= 12}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
