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
  ClipboardCheckIcon,
  LayoutDashboardIcon,
  Loader2,
} from "lucide-react";

import { useNavigationPending } from "@/components/layout/navigation-pending";
import { PageHeading } from "@/components/layout/page-heading";
import {
  AiEarlyWarningOverviewCards,
  AiEarlyWarningStudentsCard,
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
import type { InstructorDashboardData } from "@/lib/instructor/queries";
import { cn } from "@/lib/utils";

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

function riskBadgeClass(risk: string) {
  if (risk === "High" || risk === "Severe") {
    return "bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200";
  }
  if (risk === "Moderate") {
    return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
  }
  return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
}

function alertDotClass(tone: InstructorDashboardData["recentAlerts"][number]["tone"]) {
  if (tone === "high") return "bg-orange-500";
  if (tone === "moderate") return "bg-amber-500";
  if (tone === "low") return "bg-emerald-500";
  return "bg-muted-foreground";
}

export function InstructorDashboard({
  data,
}: {
  firstName?: string;
  data: InstructorDashboardData;
}) {
  const { navigate, isPending, pendingHref } = useNavigationPending();
  const [yearFilter, setYearFilter] = React.useState("all");

  const scoped =
    yearFilter === "all"
      ? {
          totalStudents: data.totalStudents,
          monitoredCount: data.monitoredCount,
          submittedCount: data.submittedCount,
          pendingCount: data.pendingCount,
          completionPercent: data.completionPercent,
          lowRiskCount: data.lowRiskCount,
          moderateRiskCount: data.moderateRiskCount,
          highRiskCount: data.highRiskCount,
          lowRiskPercent: data.lowRiskPercent,
          moderateRiskPercent: data.moderateRiskPercent,
          highRiskPercent: data.highRiskPercent,
          earlyWarningCount: data.earlyWarningCount,
          nextWeekHighCount: data.nextWeekHighCount,
          week2HighCount: data.week2HighCount,
        }
      : (() => {
          const year = Number(yearFilter);
          const stats = data.yearStats.find((c) => c.year_level === year);
          const total = stats?.total ?? 0;
          const pct = (count: number) =>
            total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
          const submitted = stats?.submitted ?? 0;
          return {
            totalStudents: total,
            monitoredCount: stats?.monitored ?? 0,
            submittedCount: submitted,
            pendingCount: Math.max(total - submitted, 0),
            completionPercent: pct(submitted),
            lowRiskCount: stats?.low ?? 0,
            moderateRiskCount: stats?.moderate ?? 0,
            highRiskCount: stats?.high ?? 0,
            lowRiskPercent: pct(stats?.low ?? 0),
            moderateRiskPercent: pct(stats?.moderate ?? 0),
            highRiskPercent: pct(stats?.high ?? 0),
            earlyWarningCount: stats?.earlyWarningCount ?? 0,
            nextWeekHighCount: stats?.nextWeekHighCount ?? 0,
            week2HighCount: stats?.week2HighCount ?? 0,
          };
        })();

  const monitoredPercent =
    scoped.totalStudents > 0
      ? Math.round((scoped.monitoredCount / scoped.totalStudents) * 1000) / 10
      : 0;

  const yearChartData = (
    yearFilter === "all"
      ? data.yearStats
      : data.yearStats.filter((item) => item.year_level === Number(yearFilter))
  ).map((item) => ({
    label: yearLevelChartLabel(item.year_level),
    year_level: item.year_level,
    low: item.low,
    moderate: item.moderate,
    high: item.high,
  }));

  const filteredAttention =
    yearFilter === "all"
      ? data.attentionStudents
      : data.attentionStudents.filter(
          (s) => s.year_level === Number(yearFilter)
        );

  const trendData = data.weeklyTrends.map((item) => ({
    weekLabel: `Week ${item.week}`,
    low: item.lowCount ?? 0,
    moderate: item.moderateCount ?? 0,
    high: item.highCount ?? 0,
  }));

  const maxFactor = Math.max(...data.riskFactors.map((f) => f.count), 1);
  const pendingPercent = Math.max(0, 100 - scoped.completionPercent);

  const termLine = [
    data.currentWeek != null ? `Week ${data.currentWeek}` : null,
    data.academicYear ? `Academic Year ${data.academicYear}` : null,
    data.semester,
  ]
    .filter(Boolean)
    .join(" | ");

  const pendingHrefPath =
    yearFilter === "all"
      ? "/instructor/monitoring"
      : `/instructor/monitoring?year_level=${encodeURIComponent(yearFilter)}`;

  return (
    <div className="min-w-0 max-w-full space-y-8 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <span className="student-chum-pill w-fit">Instructor dashboard</span>
          <PageHeading title="Instructor Dashboard" icon={LayoutDashboardIcon} />
          {data.departmentName ? (
            <p className="mt-1 break-words text-base font-medium text-foreground">
              {data.departmentName}
            </p>
          ) : null}
          {termLine ? (
            <p className="mt-0.5 break-words text-sm text-muted-foreground">
              {termLine}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">
              Department monitoring overview for your assigned students.
            </p>
          )}
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

      <section className="min-w-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OverviewCard
            label="High Risk"
            value={scoped.highRiskCount}
            hint={`${scoped.highRiskPercent}% · Need follow-up this week`}
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
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <OverviewCard
            label="My Students"
            value={scoped.totalStudents}
            hint="In department"
            compact
          />
          <OverviewCard
            label="Monitored"
            value={scoped.monitoredCount}
            hint={`${monitoredPercent}% this week`}
            compact
          />
          <OverviewCard
            label="Low Risk"
            value={scoped.lowRiskCount}
            hint={`${scoped.lowRiskPercent}%`}
            tone="low"
            compact
          />
          <OverviewCard
            label="Moderate Risk"
            value={scoped.moderateRiskCount}
            hint={`${scoped.moderateRiskPercent}%`}
            tone="moderate"
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
                  <Bar
                    dataKey="low"
                    stackId="risk"
                    fill="var(--color-low)"
                    radius={[0, 0, 0, 0]}
                  />
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
          title="My Students' Burnout Risk Trend"
          data={trendData}
        />
      </div>

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
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangleIcon className="size-4 shrink-0 text-orange-700 dark:text-orange-400" />
            Students Requiring Attention
          </CardTitle>
          <CardDescription>
            High and moderate risk students — open a profile for the full burnout
            picture.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          {filteredAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No students currently need elevated attention.
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
                        <span className="truncate">
                          Concern:{" "}
                          <span className="text-foreground">
                            {student.mainConcern}
                          </span>
                        </span>
                        <span className="col-span-2">
                          Last:{" "}
                          {student.monitoring_date
                            ? formatDateTime(student.monitoring_date)
                            : "—"}
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
                          "View profile"
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="hidden max-w-full overflow-x-auto overscroll-x-contain md:block">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Student</th>
                      <th className="px-2 py-1.5 font-medium">Class</th>
                      <th className="px-2 py-1.5 font-medium">Risk</th>
                      <th className="px-2 py-1.5 font-medium">MFBI</th>
                      <th className="px-2 py-1.5 font-medium">Main Concern</th>
                      <th className="px-2 py-1.5 font-medium">Last Assessment</th>
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
                          <td className="px-2 py-1.5">{student.mainConcern}</td>
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
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-lg">Common Risk Factors</CardTitle>
            <CardDescription>
              Primary contributors among your assessed students.
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
                      {factor.count}
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
              Weekly Monitoring Status
            </CardTitle>
            <CardDescription>
              Assessment completion for the current monitoring week.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Completed</span>
                <span className="tabular-nums text-muted-foreground">
                  {scoped.completionPercent}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-600/80 dark:bg-emerald-500/80"
                  style={{ width: `${scoped.completionPercent}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Pending</span>
                <span className="tabular-nums text-muted-foreground">
                  {pendingPercent}%
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-500/80"
                  style={{ width: `${pendingPercent}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {scoped.submittedCount} Completed
              </span>
              {" · "}
              {scoped.pendingCount} Pending
            </p>
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

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-lg">Recent Early Warnings</CardTitle>
            <CardDescription>
              What changed recently across your students.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.recentAlerts.map((alert, index) => (
                <li key={`${alert.text}-${index}`} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      alertDotClass(alert.tone)
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-sm leading-snug break-words">
                      {alert.text}
                    </p>
                    <p className="text-xs text-muted-foreground">{alert.meta}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
