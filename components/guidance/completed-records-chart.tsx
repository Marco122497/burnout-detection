"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const COMPLETED_RECORDS = [
  { week: "Week 1", records: 854 },
  { week: "Week 2", records: 929 },
  { week: "Week 3", records: 953 },
];

const TOTAL_COMPLETED_RECORDS = COMPLETED_RECORDS.reduce(
  (sum, row) => sum + row.records,
  0
);

const chartConfig = {
  records: {
    label: "Completed records",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function CompletedRecordsChart() {
  return (
    <figure className="mx-auto w-full max-w-3xl space-y-4">
      <figcaption className="text-center">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
          Figure 2. Completed Weekly Monitoring Records
        </h1>
      </figcaption>
      <div className="flex items-stretch gap-2">
        <p className="flex items-center text-sm text-muted-foreground [writing-mode:vertical-rl] rotate-180">
          Completed Records
        </p>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[420px] min-w-0 flex-1"
          initialDimension={{ width: 640, height: 420 }}
        >
        <BarChart
          data={COMPLETED_RECORDS}
          margin={{ top: 28, right: 12, bottom: 8, left: 0 }}
          barCategoryGap="28%"
        >
          <CartesianGrid vertical={false} strokeDasharray="4 4" />
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
          />
          <YAxis
            domain={[0, 1000]}
            ticks={[0, 200, 400, 600, 800, 1000]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={48}
            tickFormatter={(value: number) => value.toLocaleString("en-US")}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">Completed records</span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {Number(value).toLocaleString("en-US")}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Bar
            dataKey="records"
            fill="var(--color-records)"
            radius={[6, 6, 0, 0]}
            maxBarSize={72}
          >
            <LabelList
              dataKey="records"
              position="top"
              offset={8}
              className="fill-foreground"
              fontSize={13}
              formatter={(value) =>
                typeof value === "number" ? value.toLocaleString("en-US") : ""
              }
            />
          </Bar>
        </BarChart>
        </ChartContainer>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        Monitoring Week
      </p>
      <p className="text-center text-sm text-muted-foreground">
        Total completed records: {TOTAL_COMPLETED_RECORDS.toLocaleString("en-US")}
      </p>
    </figure>
  );
}
