"use client";

import { CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const WEEKS = ["Week 1", "Week 2", "Week 3"] as const;

type MeanSeries = {
  name: string;
  scale: string;
  digits: number;
  domain: [number, number];
  ticks: number[];
  means: [number, number, number];
};

const FACTORS: MeanSeries[] = [
  {
    name: "Stress Level",
    scale: "0–40",
    digits: 2,
    domain: [18, 20],
    ticks: [18, 18.5, 19, 19.5, 20],
    means: [18.97, 19.05, 19.28],
  },
  {
    name: "Academic Workload",
    scale: "0–10",
    digits: 2,
    domain: [4.7, 4.85],
    ticks: [4.7, 4.75, 4.8, 4.85],
    means: [4.76, 4.75, 4.77],
  },
  {
    name: "Study Time",
    scale: "0–25 hours/week",
    digits: 2,
    domain: [12.5, 13.3],
    ticks: [12.5, 12.7, 12.9, 13.1, 13.3],
    means: [12.74, 12.85, 13.06],
  },
  {
    name: "Sleep Hours",
    scale: "0–100",
    digits: 2,
    domain: [47.2, 48.8],
    ticks: [47.2, 47.6, 48, 48.4, 48.8],
    means: [47.67, 48.03, 48.44],
  },
];

const MFBI: MeanSeries = {
  name: "MFBI",
  scale: "0–1",
  digits: 4,
  domain: [0.482, 0.494],
  ticks: [0.482, 0.486, 0.49, 0.494],
  means: [0.4842, 0.4864, 0.4915],
};

const meanConfig = {
  mean: { label: "Mean", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatMean(value: unknown, digits: number) {
  return typeof value === "number" ? value.toFixed(digits) : "";
}

function seriesRows(series: MeanSeries) {
  return WEEKS.map((week, index) => ({
    week,
    mean: series.means[index],
  }));
}

function MeanLine({
  series,
  height,
}: {
  series: MeanSeries;
  height: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-center text-sm font-medium">
        {series.name}{" "}
        <span className="font-normal text-muted-foreground">
          ({series.scale})
        </span>
      </p>
      <ChartContainer
        config={meanConfig}
        className="aspect-auto w-full"
        style={{ height }}
        initialDimension={{ width: 480, height }}
      >
        <LineChart
          data={seriesRows(series)}
          margin={{ top: 28, right: 16, bottom: 4, left: 8 }}
        >
          <CartesianGrid vertical={false} strokeDasharray="4 4" />
          <XAxis
            dataKey="week"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis
            domain={series.domain}
            ticks={series.ticks}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={52}
            tickFormatter={(value: number) => value.toFixed(series.digits > 2 ? 3 : 2)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">Mean</span>
                    <span className="font-mono font-medium text-foreground tabular-nums">
                      {formatMean(Number(value), series.digits)}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="mean"
            stroke="var(--color-mean)"
            strokeWidth={2}
            dot={{ r: 4, fill: "var(--color-mean)" }}
            activeDot={{ r: 5 }}
          >
            <LabelList
              dataKey="mean"
              position="top"
              offset={8}
              className="fill-foreground"
              fontSize={12}
              formatter={(value) => formatMean(value, series.digits)}
            />
          </Line>
        </LineChart>
      </ChartContainer>
    </div>
  );
}

export function FactorMeansChart() {
  return (
    <figure className="mx-auto w-full max-w-5xl space-y-4">
      <figcaption className="space-y-1 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
          Figure 7. Mean Scores of the Four Academic Burnout Factors Across
          Monitoring Weeks
        </h2>
        <p className="text-sm text-muted-foreground">
          Each factor keeps its own score scale. The lines are not directly
          comparable.
        </p>
      </figcaption>
      <div className="grid gap-8 md:grid-cols-2">
        {FACTORS.map((series) => (
          <MeanLine key={series.name} series={series} height={280} />
        ))}
      </div>
      <p className="text-center text-sm text-muted-foreground">Monitoring Week</p>
    </figure>
  );
}

export function MfbiMeanChart() {
  return (
    <figure className="mx-auto w-full max-w-3xl space-y-4">
      <figcaption className="space-y-1 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
          Figure 8. Mean MFBI Across Monitoring Weeks
        </h2>
        <p className="text-sm text-muted-foreground">MFBI score scale 0–1</p>
      </figcaption>
      <MeanLine series={MFBI} height={360} />
      <p className="text-center text-sm text-muted-foreground">Monitoring Week</p>
    </figure>
  );
}
