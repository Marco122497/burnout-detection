"use client";

import { useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangleIcon,
  LightbulbIcon,
  Loader2,
} from "lucide-react";

import { sendStudentBurnoutAlert } from "@/app/actions/guidance";
import { useNavigationPending } from "@/components/layout/navigation-pending";
import {
  AiEarlyWarningOverviewCards,
  AiEarlyWarningStudentsCard,
  AiModelStatusCard,
} from "@/components/shared/ai-early-warning-panel";
import { Button } from "@/components/ui/button";
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
import { openPrintReport } from "@/lib/instructor/export";
import type { getGuidanceAnalytics } from "@/lib/guidance/monitoring";
import type { ModelEvaluationSnapshot } from "@/lib/guidance/model-metrics";
import { cn, formatYearLevel } from "@/lib/utils";

type Analytics = ReturnType<typeof getGuidanceAnalytics>;

const riskConfig = {
  low: { label: "Low Risk", color: "oklch(0.72 0.15 160)" },
  moderate: { label: "Moderate Risk", color: "oklch(0.8 0.15 85)" },
  high: { label: "High Risk", color: "oklch(0.68 0.19 40)" },
} satisfies ChartConfig;

const scoreConfig = {
  average: { label: "Avg MFBI", color: "var(--chart-1)" },
} satisfies ChartConfig;

const yearConfig = {
  highRiskCount: { label: "High-risk students", color: "var(--primary)" },
  average: { label: "Avg MFBI", color: "var(--chart-2)" },
} satisfies ChartConfig;

const courseConfig = {
  average: { label: "Avg MFBI", color: "var(--primary)" },
} satisfies ChartConfig;

function OverviewCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "low" | "moderate" | "high" | "neutral";
}) {
  const toneClass =
    tone === "low"
      ? "text-emerald-700"
      : tone === "moderate"
        ? "text-amber-800"
        : tone === "high"
          ? "text-orange-800"
          : "";

  return (
    <Card>
      <CardHeader className="gap-1.5 py-1">
        <CardDescription className="text-sm font-medium">
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight tabular-nums",
            toneClass
          )}
        >
          {value}
        </CardTitle>
        {hint ? (
          <p className="text-sm text-muted-foreground">{hint}</p>
        ) : null}
      </CardHeader>
    </Card>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function GuidanceAnalyticsView({
  data,
  modelEvaluation,
  aiHealthy,
}: {
  data: Analytics;
  modelEvaluation: ModelEvaluationSnapshot;
  aiHealthy: boolean;
}) {
  const { navigate, isPending, pendingHref } = useNavigationPending();
  const [alertPendingId, setAlertPendingId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [isAlertPending, startAlertTransition] = useTransition();
  const [yearMetric, setYearMetric] = useState<"highRiskCount" | "average">(
    "highRiskCount"
  );

  const pieData = data.riskOverview.map((item) => ({
    ...item,
    key: item.label.toLowerCase() as "low" | "moderate" | "high",
    fill: `var(--color-${item.label.toLowerCase()})`,
  }));

  const trendData = data.weeklyTrends.map((item) => ({
    ...item,
    weekLabel: `Week ${item.week}`,
    average: Number(item.average.toFixed(2)),
  }));

  const courseChartData = data.byCourse
    .filter((item) => item.count > 0)
    .map((item) => ({
      ...item,
      average: Number(item.average.toFixed(2)),
    }));

  function sendAlert(studentId: string) {
    setAlertMessage(null);
    setAlertError(null);
    setAlertPendingId(studentId);
    startAlertTransition(async () => {
      const result = await sendStudentBurnoutAlert(studentId);
      setAlertPendingId(null);
      if (result.error) {
        setAlertError(result.error);
        return;
      }
      setAlertMessage(result.success ?? "Alert sent.");
    });
  }

  function generateStudentReport(student: Analytics["highRiskStudents"][number]) {
    openPrintReport(
      `High-risk student report · ${student.full_name}`,
      `<table>
        <thead><tr><th>Field</th><th>Value</th></tr></thead>
        <tbody>
          <tr><td>Student</td><td>${student.full_name}</td></tr>
          <tr><td>Student ID</td><td>${student.student_number || "—"}</td></tr>
          <tr><td>Course</td><td>${student.course || "—"}</td></tr>
          <tr><td>Year Level</td><td>${student.year_level != null ? formatYearLevel(student.year_level) : "—"}</td></tr>
          <tr><td>Burnout Score (MFBI)</td><td>${student.mfbi_score != null ? student.mfbi_score.toFixed(2) : "—"}</td></tr>
          <tr><td>Risk</td><td>${student.risk}</td></tr>
          <tr><td>Status</td><td>${student.status}</td></tr>
        </tbody>
      </table>
      <p style="margin-top:16px;font-size:12px;color:#555">Generated from Burnout Analytics for immediate intervention follow-up.</p>`
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Burnout Overview */}
      <section>
        <SectionHeading
          title="Burnout Overview"
          description="Summary of students monitored and risk distribution across the university."
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <OverviewCard
            label="Students Monitored"
            value={data.totalStudents}
            hint={`${data.classifiedCount} with risk data`}
          />
          {data.riskOverview.map((item) => (
            <OverviewCard
              key={item.label}
              label={`${item.label} Risk`}
              value={item.count}
              hint={`${item.percent}% of classified`}
              tone={item.label.toLowerCase() as "low" | "moderate" | "high"}
            />
          ))}
          <OverviewCard
            label="Average Burnout Score"
            value={
              data.averageMfbi != null ? data.averageMfbi.toFixed(2) : "—"
            }
            hint="Mean MFBI"
          />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <AiEarlyWarningOverviewCards
            earlyWarningCount={data.earlyWarningCount}
            nextWeekHighCount={data.nextWeekHighCount}
            week2HighCount={data.week2HighCount}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Risk Distribution */}
        <section className="min-w-0">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Burnout Risk Distribution</CardTitle>
              <CardDescription>
                How the student population is distributed across burnout risk
                levels.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0">
              {pieData.every((item) => item.count === 0) ? (
                <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  No monitoring data yet.
                </p>
              ) : (
                <ChartContainer
                  config={riskConfig}
                  className="aspect-auto mx-auto h-[200px] w-full max-w-full"
                >
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <ChartTooltip
                      content={<ChartTooltipContent nameKey="key" hideLabel />}
                    />
                    <Pie
                      data={pieData}
                      dataKey="count"
                      nameKey="key"
                      innerRadius={48}
                      outerRadius={72}
                      strokeWidth={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.key} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartLegend
                      content={<ChartLegendContent nameKey="key" className="pt-1" />}
                      verticalAlign="bottom"
                    />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Weekly Monitoring Completion */}
        <section className="min-w-0">
          <Card className="h-full overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">
                Weekly Monitoring Completion
              </CardTitle>
              <CardDescription>
                Share of students who submitted this week&apos;s monitoring form.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0 space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">
                    Completed weekly assessment
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums">
                    {data.completionPercent}%
                  </p>
                </div>
                <p className="shrink-0 text-sm text-muted-foreground">
                  {data.submittedCount} / {data.totalStudents}
                </p>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.max(data.completionPercent, data.completionPercent > 0 ? 2 : 0)}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* 3. Burnout Trend */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Burnout Trend</CardTitle>
            <CardDescription>
              Average burnout score (MFBI) by monitoring week — use this to see
              whether burnout is rising or falling over time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <p className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                No weekly trend yet.
              </p>
            ) : (
              <ChartContainer
                config={scoreConfig}
                className="aspect-auto h-[250px] w-full max-w-full"
              >
                <LineChart data={trendData}>
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
                  />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => String(value)}
                        indicator="dot"
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
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* By Year Level */}
        <section className="min-w-0">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-lg">Burnout by Year Level</CardTitle>
                <CardDescription>
                  Compare burnout across year levels.
                </CardDescription>
              </div>
              <select
                value={yearMetric}
                onChange={(event) =>
                  setYearMetric(
                    event.target.value as "highRiskCount" | "average"
                  )
                }
                aria-label="Year level metric"
                className="h-8 w-full shrink-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-auto"
              >
                <option value="highRiskCount">High-risk count</option>
                <option value="average">Average MFBI</option>
              </select>
            </CardHeader>
            <CardContent className="min-w-0 px-2 sm:px-(--card-spacing)">
              {data.byYearLevel.length === 0 ? (
                <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                  No year-level data yet.
                </p>
              ) : (
                <ChartContainer
                  config={yearConfig}
                  className="aspect-auto h-[260px] w-full max-w-full"
                >
                  <BarChart
                    data={data.byYearLevel}
                    margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      tickMargin={8}
                      tickFormatter={(value: string) =>
                        value.replace(" Year", "")
                      }
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={28}
                      domain={
                        yearMetric === "average" ? [0, 1] : [0, "auto"]
                      }
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey={yearMetric}
                      fill={`var(--color-${yearMetric})`}
                      radius={[4, 4, 0, 0]}
                      barSize={50}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </section>

        {/* By Program/Course */}
        <section className="min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Burnout by Program / Course
              </CardTitle>
              <CardDescription>
                Average burnout risk by academic program — highlights programs
                that may need extra support.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-w-0 px-2 sm:px-(--card-spacing)">
              {courseChartData.length === 0 ? (
                <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                  No program data yet.
                </p>
              ) : (
                <ChartContainer
                  config={courseConfig}
                  className="aspect-auto w-full max-w-full"
                  style={{
                    height: Math.max(140, courseChartData.length * 40),
                  }}
                >
                  <BarChart
                    data={courseChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, bottom: 4, left: 4 }}
                    barCategoryGap={10}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 1]}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={70}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={4}
                      tickFormatter={(value: string) =>
                        value.length > 8 ? `${value.slice(0, 8)}…` : value
                      }
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="average"
                      fill="var(--color-average)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={50}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 6. Variable Contribution */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Variable Contribution</CardTitle>
              <CardDescription>
                Contribution of each monitoring factor to the current
                average MFBI factors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.variableContribution.every((item) => item.percent == null) ? (
                <p className="text-sm text-muted-foreground">
                  No factor averages yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 font-medium">Variable</th>
                        <th className="px-2 py-1.5 font-medium">Contribution</th>
                        <th className="px-2 py-1.5 font-medium">Scale</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.variableContribution.map((item) => (
                        <tr key={item.key} className="border-b last:border-0">
                          <td className="px-2 py-1.5 font-medium">{item.label}</td>
                          <td className="px-2 py-1.5 tabular-nums">
                            {item.percent != null ? `${item.percent}%` : "—"}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {item.scale}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 7. Average Scores */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Average Scores per Variable
              </CardTitle>
              <CardDescription>
                Current state of each monitored factor across students with
                submissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Variable</th>
                      <th className="px-2 py-1.5 font-medium">Average</th>
                      <th className="px-2 py-1.5 font-medium">Scale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.averageScores.map((item) => (
                      <tr key={item.label} className="border-b last:border-0">
                        <td className="px-2 py-1.5 font-medium">{item.label}</td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {item.average != null ? item.average.toFixed(2) : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {item.scale}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* 8. Students Requiring Immediate Attention */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangleIcon className="size-4 text-orange-700" />
              Students Requiring Immediate Attention
            </CardTitle>
            <CardDescription>
              High-risk students ranked by burnout score for timely intervention.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertMessage ? (
              <p className="text-sm text-emerald-700">{alertMessage}</p>
            ) : null}
            {alertError ? (
              <p className="text-sm text-destructive">{alertError}</p>
            ) : null}
            {data.highRiskStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No high-risk students in the latest snapshot.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Student ID</th>
                      <th className="px-2 py-1.5 font-medium">Student</th>
                      <th className="px-2 py-1.5 font-medium">Burnout Score</th>
                      <th className="px-2 py-1.5 font-medium">Risk</th>
                      <th className="px-2 py-1.5 font-medium">Status</th>
                      <th className="px-2 py-1.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.highRiskStudents.map((student) => {
                      const viewHref = `/guidance/monitoring/${student.id}`;
                      const viewLoading =
                        isPending && pendingHref === viewHref;
                      const sending =
                        isAlertPending && alertPendingId === student.id;
                      return (
                        <tr key={student.id} className="border-b last:border-0">
                          <td className="px-2 py-1.5 tabular-nums">
                            {student.student_number || "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {[student.course, student.year_level != null ? formatYearLevel(student.year_level) : null]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </p>
                          </td>
                          <td className="px-2 py-1.5 tabular-nums">
                            {student.mfbi_score != null
                              ? student.mfbi_score.toFixed(2)
                              : "—"}
                          </td>
                          <td className="px-2 py-1.5">{student.risk}</td>
                          <td className="px-2 py-1.5">
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900">
                              {student.status}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="flex flex-wrap gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={viewLoading}
                                onClick={() => navigate(viewHref)}
                              >
                                {viewLoading ? (
                                  <>
                                    <Loader2 className="animate-spin" />
                                    Loading…
                                  </>
                                ) : (
                                  "View Student"
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={sending}
                                onClick={() => sendAlert(student.id)}
                              >
                                {sending ? (
                                  <>
                                    <Loader2 className="animate-spin" />
                                    Sending…
                                  </>
                                ) : (
                                  "Send Alert"
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => generateStudentReport(student)}
                              >
                                Generate Report
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <AiEarlyWarningStudentsCard
          students={data.earlyWarningStudents.map((s) => ({
            id: s.id,
            full_name: s.full_name,
            student_number: s.student_number,
            course: s.course,
            year_level: s.year_level,
            mfbi_score: s.mfbi_score,
            current_risk: s.current_risk,
            next_week_risk: s.next_week_risk,
            week2_risk: s.week2_risk,
            trend: s.trend,
          }))}
        />
      </section>

      {/* 9. Prediction Accuracy */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Burnout Prediction Accuracy</CardTitle>
            <CardDescription>
              Hold-out evaluation for {modelEvaluation.modelVersion} Decision
              Tree and Random Forest predictors
              {modelEvaluation.source === "unavailable"
                ? " (run npm run train to populate)"
                : " from burnout-ai training"}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {[modelEvaluation.randomForest, modelEvaluation.decisionTree].map(
                (model) => (
                  <div
                    key={model.label}
                    className="rounded-xl ring-1 ring-foreground/10"
                  >
                    <div className="border-b px-4 py-3">
                      <p className="font-medium">{model.label}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-4">
                      {(
                        [
                          ["Accuracy", model.accuracy],
                          ["Precision", model.precision],
                          ["Recall", model.recall],
                          ["F1 Score", model.f1],
                        ] as const
                      ).map(([label, value]) => (
                        <div key={label}>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums">
                            {Math.round(value * 100)}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Model</th>
                    <th className="px-2 py-1.5 font-medium">Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-2 py-1.5">Decision Tree</td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {Math.round(modelEvaluation.decisionTree.accuracy * 100)}%
                    </td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1.5">Random Forest</td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {Math.round(modelEvaluation.randomForest.accuracy * 100)}%
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        </div>
        <AiModelStatusCard
          modelEvaluation={modelEvaluation}
          aiHealthy={aiHealthy}
        />
      </section>

      {/* 11. Heatmap */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Burnout Heatmap by Program</CardTitle>
            <CardDescription>
              Risk-level counts by academic program to spot concentration of
              burnout.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.byCourse.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No program heatmap data yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Program</th>
                      <th className="px-2 py-1.5 font-medium">Low</th>
                      <th className="px-2 py-1.5 font-medium">Moderate</th>
                      <th className="px-2 py-1.5 font-medium">High</th>
                      <th className="px-2 py-1.5 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byCourse.map((row) => (
                      <tr key={row.label} className="border-b last:border-0">
                        <td className="px-2 py-1.5 font-medium">{row.label}</td>
                        <td className="px-2 py-1.5">
                          <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-900 tabular-nums">
                            {row.low}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-900 tabular-nums">
                            {row.moderate}
                          </span>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="rounded-md bg-orange-100 px-2 py-0.5 text-orange-900 tabular-nums">
                            {row.high}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 12. Recommendations */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LightbulbIcon className="size-4" />
              Recommendations
            </CardTitle>
            <CardDescription>
              Automatically generated insights from the latest university
              monitoring snapshot.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.insights.map((insight) => (
                <li
                  key={insight}
                  className="flex gap-3 border-b border-border/70 pb-3 text-sm last:border-0 last:pb-0"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
