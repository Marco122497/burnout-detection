"use client";

import {
  Cell,
  Line,
  LineChart,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangleIcon,
  ClipboardCheckIcon,
  LayoutDashboardIcon,
  Loader2,
} from "lucide-react";

import { useNavigationPending } from "@/components/layout/navigation-pending";
import { PageHeading } from "@/components/layout/page-heading";
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
import { formatDateTime } from "@/lib/auth/roles";
import type { ModelEvaluationSnapshot } from "@/lib/guidance/model-metrics";
import type { getGuidanceAnalytics } from "@/lib/guidance/monitoring";
import { cn, formatYearLevel } from "@/lib/utils";

type Analytics = ReturnType<typeof getGuidanceAnalytics>;

const riskConfig = {
  low: { label: "Low Risk", color: "oklch(0.72 0.15 160)" },
  moderate: { label: "Moderate Risk", color: "oklch(0.8 0.15 85)" },
  high: { label: "High Risk", color: "oklch(0.68 0.19 40)" },
} satisfies ChartConfig;

const trendConfig = {
  low: { label: "Low Risk", color: "oklch(0.72 0.15 160)" },
  moderate: { label: "Moderate Risk", color: "oklch(0.8 0.15 85)" },
  high: { label: "High Risk", color: "oklch(0.68 0.19 40)" },
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
      ? "text-emerald-700 dark:text-emerald-400"
      : tone === "moderate"
        ? "text-amber-800 dark:text-amber-400"
        : tone === "high"
          ? "text-orange-800 dark:text-orange-400"
          : "";

  return (
    <Card>
      <CardHeader className="gap-1 py-1">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight tabular-nums",
            toneClass
          )}
        >
          {value}
        </CardTitle>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardHeader>
    </Card>
  );
}

export function GuidanceDashboard({
  firstName,
  data,
  modelEvaluation,
  aiHealthy,
}: {
  firstName: string;
  data: Analytics;
  modelEvaluation: ModelEvaluationSnapshot;
  aiHealthy: boolean;
}) {
  const { navigate, isPending, pendingHref } = useNavigationPending();

  const low =
    data.riskOverview.find((item) => item.label === "Low")?.count ?? 0;
  const moderate =
    data.riskOverview.find((item) => item.label === "Moderate")?.count ?? 0;
  const high =
    data.riskOverview.find((item) => item.label === "High")?.count ?? 0;
  const pendingCount = Math.max(data.totalStudents - data.submittedCount, 0);
  const monitoredCount = data.classifiedCount;

  const pieData = data.riskOverview.map((item) => ({
    ...item,
    key: item.label.toLowerCase() as "low" | "moderate" | "high",
    fill: `var(--color-${item.label.toLowerCase()})`,
  }));
  const dominantRisk = [...data.riskOverview].sort(
    (a, b) => b.count - a.count
  )[0];

  const trendData = data.weeklyTrends.map((item) => ({
    weekLabel: `Week ${item.week}`,
    low: item.lowCount ?? 0,
    moderate: item.moderateCount ?? 0,
    high: item.highCount ?? 0,
  }));

  const recentActivity = [
    {
      text: `${data.submittedCount} students completed weekly monitoring`,
      meta: "This week",
    },
    {
      text: `${high} student${high === 1 ? "" : "s"} currently classified as High Risk`,
      meta: "Latest snapshot",
    },
    {
      text: `${monitoredCount} assessments processed with burnout prediction`,
      meta: "Latest snapshot",
    },
    {
      text: `Weekly risk trend covers ${data.weeklyTrends.length} monitoring week${data.weeklyTrends.length === 1 ? "" : "s"}`,
      meta: "Active term",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeading
        title={`Welcome, ${firstName}`}
        description="Administrator overview of student burnout risk, weekly monitoring, and early-warning alerts."
        icon={LayoutDashboardIcon}
      />

      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <OverviewCard label="Total Students" value={data.totalStudents} />
          <OverviewCard
            label="Students Monitored"
            value={monitoredCount}
            hint="With completed assessment"
          />
          <OverviewCard label="Low Risk" value={low} tone="low" />
          <OverviewCard
            label="Moderate Risk"
            value={moderate}
            tone="moderate"
          />
          <OverviewCard label="High Risk" value={high} tone="high" />
          <OverviewCard
            label="Pending Assessments"
            value={pendingCount}
            hint="Not submitted this week"
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <AiEarlyWarningOverviewCards
            earlyWarningCount={data.earlyWarningCount}
            nextWeekHighCount={data.nextWeekHighCount}
            week2HighCount={data.week2HighCount}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Student Burnout Risk Distribution
            </CardTitle>
            <CardDescription>
              How many students currently need attention by predicted risk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.every((item) => item.count === 0) ? (
              <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                No monitoring data yet.
              </p>
            ) : (
              <div className="space-y-3">
                <ChartContainer
                  config={riskConfig}
                  className="aspect-auto mx-auto h-[220px] w-full max-w-full"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent nameKey="key" hideLabel />
                      }
                    />
                    <Pie
                      data={pieData}
                      dataKey="count"
                      nameKey="key"
                      innerRadius={52}
                      outerRadius={78}
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
                {dominantRisk ? (
                  <p className="text-center text-sm text-muted-foreground">
                    Largest group:{" "}
                    <span className="font-medium text-foreground">
                      {dominantRisk.percent}% {dominantRisk.label} Risk
                    </span>{" "}
                    ({dominantRisk.count})
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Weekly Burnout Risk Trend</CardTitle>
            <CardDescription>
              Number of students in each risk level by monitoring week.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                No weekly trend yet.
              </p>
            ) : (
              <ChartContainer
                config={trendConfig}
                className="aspect-auto h-[250px] w-full max-w-full"
              >
                <LineChart data={trendData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="weekLabel"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value: string) =>
                      value.replace("Week ", "W")
                    }
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    width={32}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="low"
                    stroke="var(--color-low)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="moderate"
                    stroke="var(--color-moderate)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="high"
                    stroke="var(--color-high)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangleIcon className="size-4 text-orange-700 dark:text-orange-400" />
            High-Risk Students Requiring Attention
          </CardTitle>
          <CardDescription>
            Early warning list for timely guidance intervention.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.highRiskStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No high-risk students in the latest snapshot.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 font-medium">Student</th>
                    <th className="px-2 py-1.5 font-medium">Program</th>
                    <th className="px-2 py-1.5 font-medium">Risk</th>
                    <th className="px-2 py-1.5 font-medium">MFBI</th>
                    <th className="px-2 py-1.5 font-medium">Last Assessment</th>
                    <th className="px-2 py-1.5 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.highRiskStudents.map((student) => {
                    const href = `/guidance/monitoring/${student.id}`;
                    const loading = isPending && pendingHref === href;
                    return (
                      <tr key={student.id} className="border-b last:border-0">
                        <td className="px-2 py-1.5">
                          <p className="font-medium">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.student_number || "—"}
                          </p>
                        </td>
                        <td className="px-2 py-1.5">
                          {student.course || "—"}
                          {student.year_level != null
                            ? ` · ${formatYearLevel(student.year_level)}`
                            : ""}
                        </td>
                        <td className="px-2 py-1.5">
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-900 dark:bg-orange-950 dark:text-orange-200">
                            {student.risk}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 tabular-nums">
                          {student.mfbi_score != null
                            ? student.mfbi_score.toFixed(2)
                            : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">
                          {student.monitoring_date
                            ? formatDateTime(student.monitoring_date)
                            : "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={loading}
                            onClick={() => navigate(href)}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="animate-spin" />
                                Loading…
                              </>
                            ) : (
                              "View"
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>
              Snapshot of monitoring system activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recentActivity.map((item) => (
                <li key={item.text} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p>{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.meta}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheckIcon className="size-4" />
              Weekly Assessment Status
            </CardTitle>
            <CardDescription>
              Monitoring participation for the current week.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span>Completed</span>
                <span className="tabular-nums text-muted-foreground">
                  {data.submittedCount} / {data.totalStudents}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
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
              <p className="mt-1 text-xs text-muted-foreground">
                {data.completionPercent}%
              </p>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span>Pending</span>
                <span className="tabular-nums text-muted-foreground">
                  {pendingCount} / {data.totalStudents}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-500/80 transition-all"
                  style={{
                    width: `${
                      data.totalStudents > 0
                        ? Math.max(
                            (pendingCount / data.totalStudents) * 100,
                            pendingCount > 0 ? 2 : 0
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.totalStudents > 0
                  ? Math.round((pendingCount / data.totalStudents) * 1000) / 10
                  : 0}
                %
              </p>
            </div>
          </CardContent>
        </Card>

        <AiModelStatusCard
          modelEvaluation={modelEvaluation}
          aiHealthy={aiHealthy}
        />
      </div>
    </div>
  );
}
