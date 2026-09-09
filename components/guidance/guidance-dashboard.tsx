"use client";

import * as React from "react";
import { Cell, Pie, PieChart } from "recharts";
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
import { WeeklyBurnoutRiskTrendChart } from "@/components/shared/weekly-burnout-risk-trend-chart";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/auth/roles";
import type {
  AiModelStatus,
  ModelEvaluationSnapshot,
} from "@/lib/guidance/model-metrics";
import type { getGuidanceAnalytics } from "@/lib/guidance/monitoring";
import { cn, formatYearLevel } from "@/lib/utils";

type Analytics = ReturnType<typeof getGuidanceAnalytics>;

const YEAR_FILTER_OPTIONS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
] as const;

const riskConfig = {
  low: { label: "Low Risk", color: "oklch(0.72 0.15 160)" },
  moderate: { label: "Moderate Risk", color: "oklch(0.8 0.15 85)" },
  high: { label: "High Risk", color: "oklch(0.68 0.19 40)" },
} satisfies ChartConfig;

function OverviewCard({
  label,
  value,
  hint,
  tone,
  emphasize = false,
  compact = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "low" | "moderate" | "high" | "neutral";
  emphasize?: boolean;
  compact?: boolean;
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
    <Card
      className={cn(
        emphasize &&
          "border-orange-300/80 bg-orange-50/70 shadow-sm dark:border-orange-900 dark:bg-orange-950/30",
        compact && "border-border/70 bg-muted/20 shadow-none"
      )}
    >
      <CardHeader
        className={cn(
          "items-center gap-1 text-center",
          compact ? "py-2" : "py-3"
        )}
      >
        {emphasize ? (
          <p className="text-[10px] font-semibold tracking-[0.14em] text-orange-800/80 uppercase dark:text-orange-300/80">
            Priority
          </p>
        ) : null}
        <CardDescription
          className={cn(
            "font-medium tracking-wide uppercase",
            compact ? "text-[10px] text-muted-foreground" : "text-xs"
          )}
        >
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "font-[family-name:var(--font-display)] font-semibold tracking-tight tabular-nums",
            compact ? "text-xl sm:text-2xl" : "text-4xl sm:text-5xl",
            toneClass
          )}
        >
          {value}
        </CardTitle>
        {hint ? (
          <p
            className={cn(
              "text-muted-foreground",
              compact ? "text-[11px]" : "text-xs sm:text-sm"
            )}
          >
            {hint}
          </p>
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
  metricsSource,
  showAiModelStatus = false,
}: {
  firstName: string;
  data: Analytics;
  modelEvaluation: ModelEvaluationSnapshot;
  aiHealthy: boolean;
  metricsSource?: AiModelStatus["metricsSource"];
  showAiModelStatus?: boolean;
}) {
  const { navigate, isPending, pendingHref } = useNavigationPending();
  const [yearFilter, setYearFilter] = React.useState("all");

  const allLow =
    data.riskOverview.find((item) => item.label === "Low")?.count ?? 0;
  const allModerate =
    data.riskOverview.find((item) => item.label === "Moderate")?.count ?? 0;
  const allHigh =
    data.riskOverview.find((item) => item.label === "High")?.count ?? 0;

  const scoped =
    yearFilter === "all"
      ? {
          totalStudents: data.totalStudents,
          monitoredCount: data.classifiedCount,
          submittedCount: data.submittedCount,
          pendingCount: Math.max(data.totalStudents - data.submittedCount, 0),
          completionPercent: data.completionPercent,
          low: allLow,
          moderate: allModerate,
          high: allHigh,
          earlyWarningCount: data.earlyWarningCount,
          nextWeekHighCount: data.nextWeekHighCount,
          week2HighCount: data.week2HighCount,
        }
      : (() => {
          const year = Number(yearFilter);
          const stats = data.yearStats.find((c) => c.year_level === year);
          const total = stats?.total ?? 0;
          const submitted = stats?.submitted ?? 0;
          const pct = (count: number) =>
            total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
          return {
            totalStudents: total,
            monitoredCount: stats?.monitored ?? 0,
            submittedCount: submitted,
            pendingCount: Math.max(total - submitted, 0),
            completionPercent: pct(submitted),
            low: stats?.low ?? 0,
            moderate: stats?.moderate ?? 0,
            high: stats?.high ?? 0,
            earlyWarningCount: stats?.earlyWarningCount ?? 0,
            nextWeekHighCount: stats?.nextWeekHighCount ?? 0,
            week2HighCount: stats?.week2HighCount ?? 0,
          };
        })();

  const classifiedTotal = scoped.low + scoped.moderate + scoped.high || 1;
  const pieData = (
    [
      { label: "Low", count: scoped.low },
      { label: "Moderate", count: scoped.moderate },
      { label: "High", count: scoped.high },
    ] as const
  ).map((item) => ({
    ...item,
    percent: Math.round((item.count / classifiedTotal) * 1000) / 10,
    key: item.label.toLowerCase() as "low" | "moderate" | "high",
    fill: `var(--color-${item.label.toLowerCase()})`,
  }));
  const dominantRisk = [...pieData].sort((a, b) => b.count - a.count)[0];

  const trendData = data.weeklyTrends.map((item) => ({
    weekLabel: `Week ${item.week}`,
    low: item.lowCount ?? 0,
    moderate: item.moderateCount ?? 0,
    high: item.highCount ?? 0,
  }));

  const filteredHighRisk =
    yearFilter === "all"
      ? data.highRiskStudents
      : data.highRiskStudents.filter(
          (s) => s.year_level === Number(yearFilter)
        );

  const filteredEarlyWarning =
    yearFilter === "all"
      ? data.earlyWarningStudents
      : data.earlyWarningStudents.filter(
          (s) => s.year_level === Number(yearFilter)
        );

  const recentActivity = [
    {
      text: `${scoped.submittedCount} students completed weekly monitoring`,
      meta: "This week",
    },
    {
      text: `${scoped.high} student${scoped.high === 1 ? "" : "s"} classified as High Risk`,
      meta: "This week",
    },
    {
      text: `${scoped.monitoredCount} assessments processed with burnout prediction`,
      meta: "This week",
    },
    {
      text: `Weekly risk trend covers ${data.weeklyTrends.length} monitoring week${data.weeklyTrends.length === 1 ? "" : "s"}`,
      meta: "Active term",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <span className="student-chum-pill w-fit">Guidance dashboard</span>
          <PageHeading
            title={`Welcome, ${firstName}`}
            description="Administrator overview for the current monitoring week — student burnout risk, submissions, and early-warning alerts."
            icon={LayoutDashboardIcon}
          />
        </div>

        <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-auto sm:min-w-[220px]">
          <span className="text-xs font-medium text-muted-foreground">
            Year Level
          </span>
          <Select
            value={yearFilter}
            onValueChange={(value) => {
              if (value == null) return;
              setYearFilter(value);
            }}
          >
            <SelectTrigger className="w-full rounded-xl sm:w-[240px]">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {YEAR_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OverviewCard
            label="High Risk"
            value={scoped.high}
            hint="Need follow-up this week"
            tone="high"
            emphasize
          />
          <AiEarlyWarningOverviewCards
            earlyWarningCount={scoped.earlyWarningCount}
            nextWeekHighCount={scoped.nextWeekHighCount}
            week2HighCount={scoped.week2HighCount}
            mode="hero"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          <OverviewCard
            label="Total Students"
            value={scoped.totalStudents}
            compact
          />
          <OverviewCard
            label="Students Monitored"
            value={scoped.monitoredCount}
            hint="Completed this week"
            compact
          />
          <OverviewCard
            label="Low Risk"
            value={scoped.low}
            tone="low"
            compact
          />
          <OverviewCard
            label="Moderate Risk"
            value={scoped.moderate}
            tone="moderate"
            compact
          />
          <OverviewCard
            label="Pending Assessments"
            value={scoped.pendingCount}
            hint="Not submitted this week"
            compact
          />
          <AiEarlyWarningOverviewCards
            earlyWarningCount={scoped.earlyWarningCount}
            nextWeekHighCount={scoped.nextWeekHighCount}
            week2HighCount={scoped.week2HighCount}
            mode="secondary"
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
              How many students need attention by predicted risk for the
              current monitoring week
              {yearFilter !== "all"
                ? ` · ${YEAR_FILTER_OPTIONS.find((o) => o.value === yearFilter)?.label ?? ""}`
                : ""}
              .
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
                {dominantRisk && dominantRisk.count > 0 ? (
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

        <WeeklyBurnoutRiskTrendChart data={trendData} />
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
          {filteredHighRisk.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No high-risk students for this week
              {yearFilter !== "all" ? " in the selected year level" : ""}.
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
                  {filteredHighRisk.map((student) => {
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
        students={filteredEarlyWarning.map((s) => ({
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
                  {scoped.submittedCount} / {scoped.totalStudents}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.max(
                      scoped.completionPercent,
                      scoped.completionPercent > 0 ? 2 : 0
                    )}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {scoped.completionPercent}%
              </p>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span>Pending</span>
                <span className="tabular-nums text-muted-foreground">
                  {scoped.pendingCount} / {scoped.totalStudents}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-500/80 transition-all"
                  style={{
                    width: `${
                      scoped.totalStudents > 0
                        ? Math.max(
                            (scoped.pendingCount / scoped.totalStudents) * 100,
                            scoped.pendingCount > 0 ? 2 : 0
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {scoped.totalStudents > 0
                  ? Math.round(
                      (scoped.pendingCount / scoped.totalStudents) * 1000
                    ) / 10
                  : 0}
                %
              </p>
            </div>
          </CardContent>
        </Card>

        {showAiModelStatus ? (
          <AiModelStatusCard
            modelEvaluation={modelEvaluation}
            aiHealthy={aiHealthy}
            metricsSource={metricsSource}
          />
        ) : null}
      </div>
    </div>
  );
}
