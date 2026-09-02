"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangleIcon,
  ChartPieIcon,
  ClipboardCheckIcon,
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
import { AiBurnoutTrendChart } from "@/components/shared/ai-burnout-trend-chart";
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
import type { ModelEvaluationSnapshot } from "@/lib/guidance/model-metrics";
import type { getInstructorAnalytics } from "@/lib/instructor/queries";
import { cn } from "@/lib/utils";

type Analytics = ReturnType<typeof getInstructorAnalytics>;

const YEAR_FILTER_OPTIONS = [
  { value: "1", label: "1st Year" },
  { value: "2", label: "2nd Year" },
  { value: "3", label: "3rd Year" },
  { value: "4", label: "4th Year" },
] as const;

function yearLevelChartLabel(yearLevel: number) {
  return (
    YEAR_FILTER_OPTIONS.find((option) => option.value === String(yearLevel))
      ?.label ?? `${yearLevel}th Year`
  );
}

const riskConfig = {
  low: { label: "Low Risk", color: "oklch(0.72 0.15 160)" },
  moderate: { label: "Moderate Risk", color: "oklch(0.8 0.15 85)" },
  high: { label: "High Risk", color: "oklch(0.68 0.19 40)" },
} satisfies ChartConfig;

function OverviewCard({
  label,
  value,
  tone,
  emphasize,
}: {
  label: string;
  value: string | number;
  tone?: "low" | "moderate" | "high" | "neutral";
  emphasize?: boolean;
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
          "border-orange-300/80 bg-orange-50/60 dark:border-orange-900 dark:bg-orange-950/30"
      )}
    >
      <CardHeader className="gap-1 py-1">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl",
            toneClass
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}

function riskBadgeClass(risk: string) {
  if (risk === "High" || risk === "Severe") {
    return "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200";
  }
  if (risk === "Moderate") {
    return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  }
  return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
}

function trendSymbol(trend: "up" | "down" | "stable") {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "→";
}

function alertDotClass(tone: Analytics["recentChanges"][number]["tone"]) {
  if (tone === "high") return "bg-orange-500";
  if (tone === "moderate") return "bg-amber-500";
  if (tone === "low") return "bg-emerald-500";
  return "bg-muted-foreground";
}

export function InstructorAnalyticsView({
  data,
  departmentName,
  modelEvaluation,
  aiHealthy,
}: {
  data: Analytics;
  departmentName: string | null;
  modelEvaluation: ModelEvaluationSnapshot;
  aiHealthy: boolean;
}) {
  const { navigate, isPending, pendingHref } = useNavigationPending();
  const [yearFilter, setYearFilter] = React.useState("all");
  const [riskFilter, setRiskFilter] = React.useState("all");
  const [classFilter, setClassFilter] = React.useState("all");
  const [trendFilter, setTrendFilter] = React.useState("all");

  const departmentLabel = departmentName
    ? /^department\b/i.test(departmentName)
      ? departmentName
      : `${departmentName} Department`
    : null;

  const scoped =
    yearFilter === "all"
      ? {
          totalStudents: data.totalStudents,
          monitoredCount: data.monitoredCount,
          lowRiskCount: data.lowRiskCount,
          moderateRiskCount: data.moderateRiskCount,
          highRiskCount: data.highRiskCount,
          submittedCount: data.submittedCount,
          pendingCount: data.pendingCount,
          completionPercent: data.completionPercent,
        }
      : (() => {
          const year = Number(yearFilter);
          const stats = data.yearStats.find((c) => c.year_level === year);
          const total = stats?.total ?? 0;
          const submitted = stats?.submitted ?? 0;
          return {
            totalStudents: total,
            monitoredCount: stats?.monitored ?? 0,
            lowRiskCount: stats?.low ?? 0,
            moderateRiskCount: stats?.moderate ?? 0,
            highRiskCount: stats?.high ?? 0,
            submittedCount: submitted,
            pendingCount: Math.max(total - submitted, 0),
            completionPercent:
              total > 0 ? Math.round((submitted / total) * 1000) / 10 : 0,
          };
        })();

  const yearChartData = (
    yearFilter === "all"
      ? data.yearStats
      : data.yearStats.filter((item) => item.year_level === Number(yearFilter))
  ).map((item) => ({
    label: yearLevelChartLabel(item.year_level),
    year_level: item.year_level,
    total: item.total,
    low: item.low,
    moderate: item.moderate,
    high: item.high,
  }));

  const classFilterOptions =
    yearFilter === "all"
      ? data.classOptions
      : data.riskByClass
          .filter((item) => item.year_level === Number(yearFilter))
          .map((item) => item.label);

  const filteredAttention = data.attentionStudents.filter((student) => {
    if (
      yearFilter !== "all" &&
      student.year_level !== Number(yearFilter)
    ) {
      return false;
    }
    if (riskFilter !== "all") {
      const normalized =
        student.risk === "Severe" ? "High" : student.risk;
      if (normalized !== riskFilter) return false;
    }
    if (classFilter !== "all" && student.classLabel !== classFilter) {
      return false;
    }
    if (trendFilter !== "all" && student.trend !== trendFilter) {
      return false;
    }
    return true;
  });

  const trendData = data.weeklyTrends.map((item) => ({
    weekLabel: `Week ${item.week}`,
    low: item.lowCount ?? 0,
    moderate: item.moderateCount ?? 0,
    high: item.highCount ?? 0,
  }));

  const maxFactor = Math.max(...data.riskFactors.map((f) => f.count), 1);
  const pendingHrefPath =
    yearFilter === "all"
      ? "/instructor/monitoring"
      : `/instructor/monitoring?year_level=${encodeURIComponent(yearFilter)}`;

  return (
    <div className="min-w-0 max-w-full space-y-8 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <PageHeading title="Burnout Analytics" icon={ChartPieIcon} />
          {departmentLabel ? (
            <p className="mt-1 break-words text-base font-medium text-foreground">
              {departmentLabel}
            </p>
          ) : null}
          <p className="mt-0.5 max-w-xl text-sm text-muted-foreground">
            Monitor burnout risk and contributing factors among your students.
          </p>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
          <div className="flex min-w-0 flex-col gap-1.5 sm:w-[180px]">
            <span className="text-xs font-medium text-muted-foreground">
              Class
            </span>
            <Select
              value={yearFilter}
              onValueChange={(value) => {
                if (value == null) return;
                setYearFilter(value);
                setClassFilter("all");
              }}
            >
              <SelectTrigger className="w-full">
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
      </div>

      <section className="min-w-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <OverviewCard label="Total Students" value={scoped.totalStudents} />
          <OverviewCard label="Monitored" value={scoped.monitoredCount} />
          <OverviewCard
            label="Low Risk"
            value={scoped.lowRiskCount}
            tone="low"
          />
          <OverviewCard
            label="Moderate Risk"
            value={scoped.moderateRiskCount}
            tone="moderate"
          />
          <OverviewCard
            label="High Risk"
            value={scoped.highRiskCount}
            tone="high"
            emphasize
          />
        </div>
        {yearFilter === "all" ? (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AiEarlyWarningOverviewCards
              earlyWarningCount={data.earlyWarningCount}
              nextWeekHighCount={data.nextWeekHighCount}
              week2HighCount={data.week2HighCount}
            />
          </div>
        ) : null}
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Burnout Risk by Year Level</CardTitle>
            <CardDescription>
              Low, Moderate, and High risk counts combined across all sections
              in each year level.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0 overflow-hidden">
            {yearChartData.length === 0 ? (
              <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                No year-level risk data yet.
              </p>
            ) : (
              <ChartContainer
                config={riskConfig}
                className="aspect-auto h-[260px] w-full sm:h-[280px]"
              >
                <BarChart
                  data={yearChartData}
                  layout="vertical"
                  margin={{ left: 0, right: 8, top: 4, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={80}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="low" stackId="risk" fill="var(--color-low)" />
                  <Bar
                    dataKey="moderate"
                    stackId="risk"
                    fill="var(--color-moderate)"
                  />
                  <Bar
                    dataKey="high"
                    stackId="risk"
                    fill="var(--color-high)"
                    radius={[0, 4, 4, 0]}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <WeeklyBurnoutRiskTrendChart
          className="min-w-0 overflow-hidden"
          data={trendData}
        />
      </div>

      <AiBurnoutTrendChart
        className="min-w-0 overflow-hidden"
        title="AI Burnout Trend"
        weeklyTrends={data.weeklyTrends}
        earlyWarningStudents={
          yearFilter === "all"
            ? data.aiProjectionStudents
            : data.aiProjectionStudents.filter(
                (s) => s.year_level === Number(yearFilter)
              )
        }
      />

      <AiEarlyWarningStudentsCard
        students={
          yearFilter === "all"
            ? data.earlyWarningStudents
            : data.earlyWarningStudents.filter(
                (s) => s.year_level === Number(yearFilter)
              )
        }
      />

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangleIcon className="size-4 shrink-0 text-orange-700 dark:text-orange-400" />
              Students Requiring Attention
            </CardTitle>
            <CardDescription>
              High and moderate risk students with main factor and risk trend.
            </CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Select
              value={riskFilter}
              onValueChange={(value) => {
                if (value == null) return;
                setRiskFilter(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Risk: All</SelectItem>
                <SelectItem value="High">Risk: High</SelectItem>
                <SelectItem value="Moderate">Risk: Moderate</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={classFilter}
              onValueChange={(value) => {
                if (value == null) return;
                setClassFilter(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Class: All</SelectItem>
                {classFilterOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={trendFilter}
              onValueChange={(value) => {
                if (value == null) return;
                setTrendFilter(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Trend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Trend: All</SelectItem>
                <SelectItem value="up">Trend: Rising</SelectItem>
                <SelectItem value="stable">Trend: Stable</SelectItem>
                <SelectItem value="down">Trend: Improving</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="min-w-0">
          {filteredAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No students match the current attention filters.
            </p>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredAttention.map((student) => {
                  const href = `/instructor/monitoring/${student.id}`;
                  const loading = isPending && pendingHref === href;
                  return (
                    <div
                      key={student.id}
                      className="space-y-2 border-b border-border/70 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {student.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student.student_number || "—"} · {student.classLabel}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                            riskBadgeClass(student.risk)
                          )}
                        >
                          {student.risk}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>
                          MFBI:{" "}
                          <span className="tabular-nums text-foreground">
                            {student.mfbi_score != null
                              ? student.mfbi_score.toFixed(2)
                              : "—"}
                          </span>
                        </span>
                        <span>
                          Factor:{" "}
                          <span className="text-foreground">
                            {student.mainFactor}
                          </span>
                        </span>
                        <span>
                          Trend:{" "}
                          <span className="text-foreground">
                            {trendSymbol(student.trend)}
                          </span>
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled={loading}
                        onClick={() => navigate(href)}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="animate-spin" />
                            Loading…
                          </>
                        ) : (
                          "View Student"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="hidden max-w-full overflow-x-auto overscroll-x-contain md:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Student</th>
                      <th className="px-2 py-1.5 font-medium">Section</th>
                      <th className="px-2 py-1.5 font-medium">Risk</th>
                      <th className="px-2 py-1.5 font-medium">MFBI</th>
                      <th className="px-2 py-1.5 font-medium">Main Risk Factor</th>
                      <th className="px-2 py-1.5 font-medium">Trend</th>
                      <th className="px-2 py-1.5 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttention.map((student) => {
                      const href = `/instructor/monitoring/${student.id}`;
                      const loading = isPending && pendingHref === href;
                      return (
                        <tr key={student.id} className="border-b last:border-0">
                          <td className="px-2 py-1.5">
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.student_number || "—"}
                            </p>
                          </td>
                          <td className="px-2 py-1.5">{student.classLabel}</td>
                          <td className="px-2 py-1.5">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-xs font-medium",
                                riskBadgeClass(student.risk)
                              )}
                            >
                              {student.risk}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 tabular-nums">
                            {student.mfbi_score != null
                              ? student.mfbi_score.toFixed(2)
                              : "—"}
                          </td>
                          <td className="px-2 py-1.5">{student.mainFactor}</td>
                          <td className="px-2 py-1.5 font-medium tabular-nums">
                            {trendSymbol(student.trend)}
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
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-lg">Common Burnout Risk Factors</CardTitle>
            <CardDescription>
              Ranked contributing factors among your assessed students.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.riskFactors.every((f) => f.count === 0) ? (
              <p className="text-sm text-muted-foreground">
                Not enough factor data yet.
              </p>
            ) : (
              data.riskFactors.map((factor) => (
                <div key={factor.label} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{factor.label}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {factor.count} students
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/80"
                      style={{
                        width: `${Math.round((factor.count / maxFactor) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheckIcon className="size-4 shrink-0" />
              Weekly Monitoring
            </CardTitle>
            <CardDescription>
              Latest assessment completion for your students.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Completed</span>
                <span className="tabular-nums text-muted-foreground">
                  {scoped.submittedCount} / {scoped.totalStudents}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-600/80 dark:bg-emerald-500/80"
                  style={{ width: `${scoped.completionPercent}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {scoped.completionPercent}% complete · {scoped.pendingCount}{" "}
                pending
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              disabled={isPending && pendingHref === pendingHrefPath}
              onClick={() => navigate(pendingHrefPath)}
            >
              {isPending && pendingHref === pendingHrefPath ? (
                <>
                  <Loader2 className="animate-spin" />
                  Loading…
                </>
              ) : (
                "View Pending Students →"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Year Level Risk Overview</CardTitle>
            <CardDescription>
              Detailed Low / Moderate / High counts by year level.
            </CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {yearChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No year-level comparison data yet.
              </p>
            ) : (
              <div className="max-w-full overflow-x-auto overscroll-x-contain">
                <table className="w-full min-w-[420px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Year Level</th>
                      <th className="px-2 py-1.5 font-medium">Students</th>
                      <th className="px-2 py-1.5 font-medium">Low</th>
                      <th className="px-2 py-1.5 font-medium">Moderate</th>
                      <th className="px-2 py-1.5 font-medium">High</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearChartData.map((row) => (
                      <tr key={row.year_level} className="border-b last:border-0">
                        <td className="px-2 py-1.5 font-medium">{row.label}</td>
                        <td className="px-2 py-1.5 tabular-nums">{row.total}</td>
                        <td className="px-2 py-1.5 tabular-nums text-emerald-700 dark:text-emerald-400">
                          {row.low}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums text-amber-800 dark:text-amber-400">
                          {row.moderate}
                        </td>
                        <td className="px-2 py-1.5 tabular-nums text-orange-800 dark:text-orange-400">
                          {row.high}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-lg">Recent Changes</CardTitle>
            <CardDescription>
              Notable risk shifts among your students.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.recentChanges.map((change, index) => (
                <li key={`${change.text}-${index}`} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      alertDotClass(change.tone)
                    )}
                  />
                  <p className="text-sm leading-snug break-words">
                    {change.text}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <AiModelStatusCard
        modelEvaluation={modelEvaluation}
        aiHealthy={aiHealthy}
      />
    </div>
  );
}
