"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

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
import { cn } from "@/lib/utils";

export type GuidanceDashboardChartData = {
  burnoutDistribution: { label: string; count: number }[];
  departmentComparison: { label: string; average: number; count: number }[];
  weeklyTrends: { week: number; average: number; count: number }[];
};

const RISK_ORDER = ["Low", "Moderate", "High", "Severe"] as const;

const riskConfig = {
  low: { label: "Low", color: "oklch(0.72 0.15 160)" },
  moderate: { label: "Moderate", color: "oklch(0.8 0.15 85)" },
  high: { label: "High", color: "oklch(0.68 0.19 40)" },
  severe: { label: "Severe", color: "oklch(0.55 0.22 25)" },
  other: { label: "Other", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

const deptConfig = {
  average: { label: "Avg MFBI", color: "var(--primary)" },
} satisfies ChartConfig;

const trendConfig = {
  average: { label: "Avg MFBI", color: "var(--chart-1)" },
} satisfies ChartConfig;

const trendRangeClassName =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function riskKey(label: string) {
  const key = label.toLowerCase();
  return key in riskConfig ? (key as keyof typeof riskConfig) : "other";
}

export function GuidanceDashboardCharts({
  data,
}: {
  data: GuidanceDashboardChartData;
}) {
  const [trendRange, setTrendRange] = React.useState("all");
  const distribution = [...data.burnoutDistribution].sort((a, b) => {
    const ai = RISK_ORDER.indexOf(a.label as (typeof RISK_ORDER)[number]);
    const bi = RISK_ORDER.indexOf(b.label as (typeof RISK_ORDER)[number]);
    return (ai === -1 ? RISK_ORDER.length : ai) -
      (bi === -1 ? RISK_ORDER.length : bi);
  });

  const pieData = distribution.map((item) => ({
    ...item,
    key: riskKey(item.label),
    fill: `var(--color-${riskKey(item.label)})`,
  }));

  const deptData = data.departmentComparison.map((item) => ({
    ...item,
    average: Number(item.average.toFixed(2)),
  }));

  const allTrendData = data.weeklyTrends.map((item) => ({
    ...item,
    weekLabel: `W${item.week}`,
    average: Number(item.average.toFixed(2)),
  }));

  const trendWindow =
    trendRange === "4w" ? 4 : trendRange === "8w" ? 8 : allTrendData.length;
  const trendData = allTrendData.slice(-trendWindow);

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Burnout risk distribution</CardTitle>
          <CardDescription>
            Latest prediction per student this term.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
              No monitoring data yet.
            </p>
          ) : (
            <ChartContainer config={riskConfig} className="h-56 w-full">
              <PieChart>
                <ChartTooltip
                  content={<ChartTooltipContent nameKey="key" hideLabel />}
                />
                <Pie
                  data={pieData}
                  dataKey="count"
                  nameKey="key"
                  innerRadius={45}
                  strokeWidth={2}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="key" />}
                  verticalAlign="bottom"
                />
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Average MFBI by department</CardTitle>
          <CardDescription>
            Latest MFBI score averaged per department.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deptData.length === 0 ? (
            <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
              No department data yet.
            </p>
          ) : (
            <ChartContainer config={deptConfig} className="h-56 w-full">
              <BarChart
                data={deptData}
                layout="vertical"
                margin={{ left: 0, right: 12 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" domain={[0, 1]} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: string) =>
                    value.length > 14 ? `${value.slice(0, 14)}…` : value
                  }
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="average"
                  fill="var(--color-average)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="pt-0 lg:col-span-2 xl:col-span-3">
        <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
          <div className="grid flex-1 gap-1">
            <CardTitle className="text-lg">Weekly MFBI trend</CardTitle>
            <CardDescription>
              University-wide average MFBI per monitoring week.
            </CardDescription>
          </div>
          <select
            value={trendRange}
            onChange={(event) => setTrendRange(event.target.value)}
            aria-label="Select week range"
            className={cn(trendRangeClassName, "hidden w-[160px] sm:ml-auto sm:block")}
          >
            <option value="all">All weeks</option>
            <option value="8w">Last 8 weeks</option>
            <option value="4w">Last 4 weeks</option>
          </select>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          {trendData.length === 0 ? (
            <p className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
              No weekly submissions yet.
            </p>
          ) : (
            <ChartContainer
              config={trendConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="fillAverage" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-average)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-average)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="weekLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                />
                <YAxis
                  domain={[0, 1]}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => `Week ${String(value).replace("W", "")}`}
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey="average"
                  type="natural"
                  fill="url(#fillAverage)"
                  stroke="var(--color-average)"
                  strokeWidth={2}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
