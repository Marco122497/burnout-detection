"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const PROGRAMS = [
  { program: "BS Criminology", frequency: 514, percentage: "30.93%" },
  { program: "BSBA Financial Management", frequency: 377, percentage: "22.68%" },
  { program: "BS Social Work", frequency: 287, percentage: "17.27%" },
  { program: "BS Computer Science", frequency: 172, percentage: "10.35%" },
  { program: "BSBA Operations Management", frequency: 156, percentage: "9.39%" },
  { program: "Bachelor of Elementary Education", frequency: 63, percentage: "3.79%" },
  { program: "BSEd English", frequency: 61, percentage: "3.67%" },
  { program: "BSEd Mathematics", frequency: 18, percentage: "1.08%" },
  { program: "BA English Language Studies", frequency: 14, percentage: "0.84%" },
];

const YEAR_LEVELS = [
  { year: "First Year", frequency: 324, percentage: "19.49%" },
  { year: "Second Year", frequency: 407, percentage: "24.49%" },
  { year: "Third Year", frequency: 431, percentage: "25.93%" },
  { year: "Fourth Year", frequency: 500, percentage: "30.08%" },
];

const TOTAL_STUDENT_RECORDS = 1662;

const frequencyConfig = {
  frequency: {
    label: "Frequency",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function countLabel(value: unknown) {
  return typeof value === "number" ? value.toLocaleString("en-US") : "";
}

function distributionTooltip(name: string) {
  return (
    <ChartTooltip
      content={
        <ChartTooltipContent
          formatter={(value, _name, item) => {
            const percentage =
              item && typeof item === "object" && "payload" in item
                ? (item.payload as { percentage?: string }).percentage
                : "";
            return (
              <div className="flex w-full items-center justify-between gap-4">
                <span className="text-muted-foreground">{name}</span>
                <span className="font-mono font-medium text-foreground tabular-nums">
                  {Number(value).toLocaleString("en-US")}
                  {percentage ? ` (${percentage})` : ""}
                </span>
              </div>
            );
          }}
        />
      }
    />
  );
}

export function ProgramDistributionChart() {
  return (
    <figure className="mx-auto w-full max-w-5xl space-y-4">
      <figcaption className="text-center">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
          Figure 4. Distribution of Student Records by Academic Program
        </h2>
      </figcaption>
      <ChartContainer
        config={frequencyConfig}
        className="aspect-auto h-[520px] w-full"
        initialDimension={{ width: 760, height: 520 }}
      >
        <BarChart
          data={PROGRAMS}
          layout="vertical"
          margin={{ top: 8, right: 108, bottom: 8, left: 8 }}
          barCategoryGap="22%"
        >
          <CartesianGrid horizontal={false} strokeDasharray="4 4" />
          <XAxis
            type="number"
            domain={[0, 600]}
            ticks={[0, 100, 200, 300, 400, 500, 600]}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value: number) => value.toLocaleString("en-US")}
          />
          <YAxis
            type="category"
            dataKey="program"
            width={230}
            reversed
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          {distributionTooltip("Frequency")}
          <Bar
            dataKey="frequency"
            fill="var(--color-frequency)"
            radius={[0, 6, 6, 0]}
            maxBarSize={28}
          >
            <LabelList
              dataKey="frequency"
              position="right"
              offset={8}
              className="fill-foreground"
              fontSize={12}
              formatter={(value) => {
                const row = PROGRAMS.find((item) => item.frequency === value);
                return row ? `${countLabel(value)} (${row.percentage})` : countLabel(value);
              }}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <p className="text-center text-sm text-muted-foreground">Frequency</p>
      <p className="text-center text-sm text-muted-foreground">
        Total student records: {TOTAL_STUDENT_RECORDS.toLocaleString("en-US")}
      </p>
    </figure>
  );
}

export function YearLevelDistributionChart() {
  return (
    <figure className="mx-auto w-full max-w-3xl space-y-4">
      <figcaption className="text-center">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
          Figure 5. Distribution of Student Records by Year Level
        </h2>
      </figcaption>
      <div className="flex items-stretch gap-2">
        <p className="flex items-center text-sm text-muted-foreground [writing-mode:vertical-rl] rotate-180">
          Frequency
        </p>
        <ChartContainer
          config={frequencyConfig}
          className="aspect-auto h-[420px] min-w-0 flex-1"
          initialDimension={{ width: 640, height: 420 }}
        >
          <BarChart
            data={YEAR_LEVELS}
            margin={{ top: 28, right: 12, bottom: 8, left: 0 }}
            barCategoryGap="28%"
          >
            <CartesianGrid vertical={false} strokeDasharray="4 4" />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis
              domain={[0, 700]}
              ticks={[0, 100, 200, 300, 400, 500, 600, 700]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={48}
              tickFormatter={(value: number) => value.toLocaleString("en-US")}
            />
            {distributionTooltip("Frequency")}
            <Bar
              dataKey="frequency"
              fill="var(--color-frequency)"
              radius={[6, 6, 0, 0]}
              maxBarSize={72}
            >
              <LabelList
                dataKey="frequency"
                position="top"
                offset={8}
                className="fill-foreground"
                fontSize={13}
                formatter={(value) => {
                  const row = YEAR_LEVELS.find((item) => item.frequency === value);
                  return row
                    ? `${countLabel(value)} (${row.percentage})`
                    : countLabel(value);
                }}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
      <p className="text-center text-sm text-muted-foreground">Year Level</p>
      <p className="text-center text-sm text-muted-foreground">
        Total student records: {TOTAL_STUDENT_RECORDS.toLocaleString("en-US")}
      </p>
    </figure>
  );
}

const PARTICIPATION = [
  {
    key: "three",
    label: "Completed 3 Weeks",
    students: 839,
    percentage: "86.67%",
  },
  {
    key: "two",
    label: "Completed 2 Weeks",
    students: 90,
    percentage: "9.30%",
  },
  {
    key: "one",
    label: "Completed 1 Week",
    students: 39,
    percentage: "4.03%",
  },
];

const TOTAL_PARTICIPANTS = 968;

const participationConfig = {
  three: {
    label: "Completed 3 Weeks, 839 (86.67%)",
    color: "var(--chart-1)",
  },
  two: {
    label: "Completed 2 Weeks, 90 (9.30%)",
    color: "var(--chart-2)",
  },
  one: {
    label: "Completed 1 Week, 39 (4.03%)",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const participationSlices = PARTICIPATION.map((row) => ({
  ...row,
  fill: `var(--color-${row.key})`,
}));

export function ParticipationChart() {
  return (
    <figure className="mx-auto w-full max-w-3xl space-y-4">
      <figcaption className="text-center">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
          Figure 6. Student Participation Across the First Three Monitoring Weeks
        </h2>
      </figcaption>
      <ChartContainer
        config={participationConfig}
        className="aspect-auto h-[420px] w-full"
        initialDimension={{ width: 640, height: 420 }}
      >
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="key"
                hideLabel
                formatter={(value, _name, item) => {
                  const percentage =
                    item && typeof item === "object" && "payload" in item
                      ? (item.payload as { percentage?: string }).percentage
                      : "";
                  return (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">Students</span>
                      <span className="font-mono font-medium text-foreground tabular-nums">
                        {Number(value).toLocaleString("en-US")}
                        {percentage ? ` (${percentage})` : ""}
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Pie
            data={participationSlices}
            dataKey="students"
            nameKey="key"
            cx="50%"
            cy="46%"
            outerRadius={130}
            startAngle={90}
            endAngle={-270}
            stroke="var(--background)"
            strokeWidth={2}
          >
            {participationSlices.map((slice) => (
              <Cell key={slice.key} fill={slice.fill} />
            ))}
          </Pie>
          <ChartLegend content={<ChartLegendContent nameKey="key" />} />
        </PieChart>
      </ChartContainer>
      <p className="text-center text-sm text-muted-foreground">
        Total students: {TOTAL_PARTICIPANTS.toLocaleString("en-US")}
      </p>
    </figure>
  );
}
