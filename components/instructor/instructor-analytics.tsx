"use client";

import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangleIcon, LightbulbIcon, Loader2 } from "lucide-react";

import { useNavigationPending } from "@/components/layout/navigation-pending";
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
import type { getInstructorAnalytics } from "@/lib/instructor/queries";
import { cn } from "@/lib/utils";

type Analytics = ReturnType<typeof getInstructorAnalytics>;

const riskConfig = {
  low: { label: "Low Risk", color: "oklch(0.72 0.15 160)" },
  moderate: { label: "Moderate Risk", color: "oklch(0.8 0.15 85)" },
  high: { label: "High Risk", color: "oklch(0.68 0.19 40)" },
} satisfies ChartConfig;

const scoreConfig = {
  average: { label: "Avg Burnout Score", color: "var(--chart-1)" },
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

export function InstructorAnalyticsView({
  data,
  departmentName,
}: {
  data: Analytics;
  departmentName: string | null;
}) {
  const { navigate, isPending, pendingHref } = useNavigationPending();

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

  return (
    <div className="space-y-8">
      <section>
        <SectionHeading
          title="Class Overview"
          description={
            departmentName
              ? `Quick summary of students in ${departmentName}.`
              : "Quick summary of students in your class."
          }
        />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <OverviewCard
            label="Total Students"
            value={data.totalStudents}
            hint="Enrolled in your department"
          />
          <OverviewCard
            label="Students Assessed"
            value={data.assessedCount}
            hint="Completed weekly monitoring"
          />
          <OverviewCard
            label="Low Burnout Risk"
            value={data.lowRiskCount}
            tone="low"
          />
          <OverviewCard
            label="Moderate Burnout Risk"
            value={data.moderateRiskCount}
            tone="moderate"
          />
          <OverviewCard
            label="High Burnout Risk"
            value={data.highRiskCount}
            tone="high"
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="min-w-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Burnout Risk Distribution</CardTitle>
              <CardDescription>
                Percentage of students in each burnout risk level.
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
                      content={
                        <ChartLegendContent nameKey="key" className="pt-1" />
                      }
                      verticalAlign="bottom"
                    />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </section>

        <section className="min-w-0">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-lg">
                Weekly Assessment Completion
              </CardTitle>
              <CardDescription>
                Monitoring participation for the current week.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Completion Percentage
                  </p>
                  <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums">
                    {data.completionPercent}%
                  </p>
                </div>
                <div className="space-y-0.5 text-sm text-muted-foreground">
                  <p>Completed Assessments: {data.submittedCount}</p>
                  <p>Pending Assessments: {data.pendingCount}</p>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.max(
                      data.completionPercent,
                      data.completionPercent > 0 ? 2 : 0
                    )}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Burnout Trend</CardTitle>
            <CardDescription>
              Weekly average burnout score (MFBI) for the class.
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

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Burnout Factors Summary</CardTitle>
            <CardDescription>
              Class average for each monitored variable. Individual questionnaire
              answers are not shown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.factorSummary.every((item) => item.average == null) ? (
              <p className="text-sm text-muted-foreground">
                No factor averages yet.
              </p>
            ) : (
              data.factorSummary.map((item) => (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{item.label}</span>
                    <span className="shrink-0 font-medium tabular-nums">
                      {item.average != null ? item.average.toFixed(1) : "—"}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/80 transition-all"
                      style={{
                        width: `${Math.max(
                          item.percent ?? 0,
                          item.percent ? 2 : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangleIcon className="size-4 text-orange-700" />
              High-Risk Students
            </CardTitle>
            <CardDescription>
              Students classified as high burnout risk who need attention.
              Overall risk only — confidential questionnaire answers are hidden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.highRiskStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No high-risk students at this time.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 font-medium">Student ID</th>
                      <th className="px-2 py-2 font-medium">Student Name</th>
                      <th className="px-2 py-2 font-medium">Burnout Score</th>
                      <th className="px-2 py-2 font-medium">
                        Burnout Risk Level
                      </th>
                      <th className="px-2 py-2 font-medium">Status</th>
                      <th className="px-2 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.highRiskStudents.map((student) => {
                      const href = `/instructor/monitoring/${student.id}`;
                      const loading = isPending && pendingHref === href;
                      return (
                        <tr
                          key={student.id}
                          className="border-b last:border-0"
                        >
                          <td className="px-2 py-2 tabular-nums text-muted-foreground">
                            {student.student_number || "—"}
                          </td>
                          <td className="px-2 py-2 font-medium">
                            {student.full_name}
                          </td>
                          <td className="px-2 py-2 tabular-nums">
                            {student.mfbi_score != null
                              ? student.mfbi_score.toFixed(2)
                              : "—"}
                          </td>
                          <td className="px-2 py-2">{student.risk}</td>
                          <td className="px-2 py-2">
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900">
                              {student.status}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={loading}
                              onClick={() => navigate(href)}
                            >
                              {loading ? (
                                <>
                                  <Loader2 className="animate-spin" />
                                  Loading…
                                </>
                              ) : (
                                "View Student Details"
                              )}
                            </Button>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LightbulbIcon className="size-4" />
              Recommendations
            </CardTitle>
            <CardDescription>
              Automatically generated suggestions based on class analytics.
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
