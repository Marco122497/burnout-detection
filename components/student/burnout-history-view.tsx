"use client";

import { Fragment, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  BurnoutFactorSection,
  BurnoutHero,
} from "@/components/shared/burnout-summary";
import { TablePagination } from "@/components/shared/table-pagination";
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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useTablePagination } from "@/hooks/use-table-pagination";
import {
  parseEarlyWarningRemarks,
  type EarlyWarningPayload,
} from "@/lib/student/ai-client";
import {
  unwrapMfbi,
  type MonitoringAnswer,
  type MonitoringAnswersMap,
  type MonitoringRow,
} from "@/lib/student/queries";
import { cn } from "@/lib/utils";

const trendChartConfig = {
  score: { label: "MFBI", color: "var(--primary)" },
  projection: { label: "Projection", color: "oklch(0.72 0.14 55)" },
} satisfies ChartConfig;

function riskTone(level: string | null | undefined) {
  if (level === "High" || level === "Severe") {
    return "text-red-700 dark:text-red-400";
  }
  if (level === "Moderate") return "text-amber-700 dark:text-amber-400";
  if (level === "Low") return "text-emerald-700 dark:text-emerald-400";
  return "text-muted-foreground";
}

function riskLevelToChartScore(level: string | null | undefined) {
  if (level === "High" || level === "Severe") return 0.85;
  if (level === "Moderate") return 0.55;
  if (level === "Low") return 0.2;
  return null;
}

function movementHighlight(direction: string | null | undefined) {
  if (direction === "increasing") {
    return "bg-amber-500/15 text-amber-950 dark:text-amber-100";
  }
  if (direction === "decreasing") {
    return "bg-emerald-500/15 text-emerald-950 dark:text-emerald-100";
  }
  return "bg-muted text-foreground";
}

function movementDeltaTone(direction: string | null | undefined) {
  if (direction === "increasing") {
    return "text-orange-600 dark:text-orange-400";
  }
  if (direction === "decreasing") {
    return "text-emerald-600 dark:text-emerald-400";
  }
  return "text-foreground";
}

function monthlyBuckets(history: MonitoringRow[]) {
  const map = new Map<string, number[]>();

  for (const row of history) {
    const key = row.monitoring_date?.slice(0, 7);
    if (!key) continue;
    const mfbi = unwrapMfbi(row)?.mfbi_score;
    if (mfbi == null) continue;
    const list = map.get(key) ?? [];
    list.push(mfbi);
    map.set(key, list);
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, scores]) => ({
      month,
      average: scores.reduce((sum, n) => sum + n, 0) / scores.length,
      kind: "actual" as const,
    }));
}

function RiskLevelText({ level }: { level: string | null | undefined }) {
  if (!level) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("font-medium", riskTone(level))}>{level}</span>
  );
}

function PredictionLabel({ level }: { level: string | null | undefined }) {
  if (!level) return <span className="text-muted-foreground">—</span>;
  const score = riskLevelToChartScore(level);
  return (
    <span className="tabular-nums text-foreground">
      {level}
      {score != null ? ` (${score.toFixed(2)})` : ""}
    </span>
  );
}

function scoreOverMax(value: number | null | undefined, max: number) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value)}/${max}`;
}

function AnswersPanel({ answers }: { answers: MonitoringAnswer[] }) {
  if (!answers.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No recorded answers for this submission.
      </p>
    );
  }

  const groups: { name: string; items: MonitoringAnswer[] }[] = [];
  for (const answer of answers) {
    const group = groups.find((g) => g.name === answer.questionnaire_name);
    if (group) {
      group.items.push(answer);
    } else {
      groups.push({ name: answer.questionnaire_name, items: [answer] });
    }
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.name}>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.name}
          </p>
          <ul className="mt-1.5 divide-y divide-border/60">
            {group.items.map((answer, index) => (
              <li
                key={answer.question_id}
                className="flex items-start justify-between gap-4 py-1.5"
              >
                <span className="text-sm">
                  <span className="mr-1.5 text-muted-foreground">
                    {index + 1}.
                  </span>
                  {answer.question_text}
                </span>
                <span className="shrink-0 text-sm font-medium">
                  {answer.answer_label ?? answer.answer_value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

type WeeklyTrendPoint = {
  week: number;
  score: number | null;
  level: string | null;
  delta: number | null;
  direction: string | null;
};

function WeeklyMfbiTrendChart({
  data,
  earlyWarning,
  movementDirection,
  movementDelta,
}: {
  data: WeeklyTrendPoint[];
  earlyWarning: EarlyWarningPayload | null;
  movementDirection: string | null;
  movementDelta: number | null;
}) {
  if (!data.length) {
    return (
      <p className="text-sm text-muted-foreground">No weekly scores yet.</p>
    );
  }

  const latest = data[data.length - 1];
  const recentCards = data.slice(-4);
  const nextWeekLevel = earlyWarning?.next_week_risk ?? null;
  const week2Level = earlyWarning?.week2_risk ?? null;
  const nextScore =
    earlyWarning?.next_week_score ?? riskLevelToChartScore(nextWeekLevel);
  const week2Score = riskLevelToChartScore(week2Level);
  const hasProjection = nextScore != null || week2Score != null;

  type ChartPoint = {
    week: string;
    weekNumber: number;
    score: number | null;
    projection: number | null;
    level: string;
    kind: "actual" | "next" | "week2";
  };

  const chartData: ChartPoint[] = data.map((point, index) => {
    const isLast = index === data.length - 1;
    return {
      week: `W${point.week}`,
      weekNumber: point.week,
      score: point.score ?? 0,
      projection: isLast && hasProjection ? (point.score ?? 0) : null,
      level: point.level ?? "—",
      kind: "actual" as const,
    };
  });

  if (nextScore != null && nextWeekLevel) {
    chartData.push({
      week: "Next",
      weekNumber: (latest?.week ?? 0) + 1,
      score: null,
      projection: nextScore,
      level: nextWeekLevel,
      kind: "next",
    });
  }

  if (week2Score != null && week2Level) {
    chartData.push({
      week: "W+2",
      weekNumber: (latest?.week ?? 0) + 2,
      score: null,
      projection: week2Score,
      level: week2Level,
      kind: "week2",
    });
  }

  return (
    <div className="space-y-4">
      {movementDirection ? (
        <div className="flex justify-end">
          <p
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold tracking-tight",
              movementHighlight(movementDirection)
            )}
          >
            Latest movement: {movementDirection}
            {movementDelta != null ? (
              <>
                {" "}
                <span
                  className={cn(
                    "font-bold tabular-nums",
                    movementDeltaTone(movementDirection)
                  )}
                >
                  ({movementDelta > 0 ? "+" : ""}
                  {movementDelta.toFixed(2)} MFBI)
                </span>
              </>
            ) : null}
          </p>
        </div>
      ) : null}

      <ChartContainer config={trendChartConfig} className="h-48 w-full">
        <LineChart data={chartData} margin={{ left: 4, right: 8, top: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="week" tickLine={false} axisLine={false} />
          <YAxis
            domain={[0, 1]}
            tickLine={false}
            axisLine={false}
            width={32}
            tickFormatter={(value) => Number(value).toFixed(1)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name, item) => {
                  const level = String(item?.payload?.level ?? "—");
                  const kind = String(item?.payload?.kind ?? "actual");
                  if (value == null) return null;
                  const label =
                    kind === "next"
                      ? "Next-week projection"
                      : kind === "week2"
                        ? "Week-2 projection"
                        : name === "projection"
                          ? "Projection link"
                          : "MFBI";
                  return (
                    <div className="flex flex-col gap-0.5">
                      <span>
                        {label}: {Number(value).toFixed(2)}
                      </span>
                      <span className={cn("text-xs", riskTone(level))}>
                        {level} risk
                        {kind !== "actual" ? " (projected)" : ""}
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--color-score)"
            strokeWidth={2.5}
            dot={{ r: 4 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
          {hasProjection ? (
            <Line
              type="monotone"
              dataKey="projection"
              stroke="var(--color-projection)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ) : null}
        </LineChart>
      </ChartContainer>

      {hasProjection ? (
        <p className="text-[11px] text-muted-foreground">
          Solid line = recorded MFBI. Dashed line = next-week ML risk and week-2
          trend projection (mapped to risk midpoints for charting).
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {recentCards.map((point) => (
          <div
            key={point.week}
            className="rounded-lg border border-border/70 px-2.5 py-2"
          >
            <p className="text-[11px] text-muted-foreground">Week {point.week}</p>
            <p className="text-sm font-semibold tabular-nums">
              {point.score != null ? point.score.toFixed(2) : "—"}
            </p>
            <p className={cn("text-[11px] font-medium", riskTone(point.level))}>
              {point.level ?? "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BurnoutHistoryView({
  stressLevel,
  history,
  answers,
}: {
  stressLevel: string | null;
  history: MonitoringRow[];
  answers: MonitoringAnswersMap;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const {
    page,
    pageSize,
    totalItems,
    pageItems,
    setPage,
    setPageSize,
  } = useTablePagination(history, 10);
  const latest = history[0] ?? null;
  const mfbi = latest ? unwrapMfbi(latest) : null;
  const earlyWarning = parseEarlyWarningRemarks(
    latest?.prediction?.remarks ?? null
  );
  const previous = history[1] ?? null;
  const previousMfbi = previous ? unwrapMfbi(previous)?.mfbi_score : null;
  const latestMfbi = mfbi?.mfbi_score ?? null;
  const movementDelta =
    latestMfbi != null && previousMfbi != null
      ? latestMfbi - previousMfbi
      : null;
  const movementDirection =
    earlyWarning?.trend && earlyWarning.trend !== "insufficient_history"
      ? earlyWarning.trend
      : movementDelta != null
        ? movementDelta >= 0.08
          ? "increasing"
          : movementDelta <= -0.08
            ? "decreasing"
            : "stable"
        : null;

  const monthly = monthlyBuckets(history);
  const weeklyTrend: WeeklyTrendPoint[] = [...history]
    .reverse()
    .map((row, index, rows) => {
      const result = unwrapMfbi(row);
      const score = result?.mfbi_score ?? null;
      const prevScore =
        index > 0 ? (unwrapMfbi(rows[index - 1])?.mfbi_score ?? null) : null;
      const delta =
        score != null && prevScore != null ? score - prevScore : null;
      return {
        week: row.week_number,
        score,
        level:
          row.prediction?.final_prediction ?? result?.burnout_level ?? null,
        delta,
        direction:
          delta == null
            ? null
            : delta >= 0.08
              ? "increasing"
              : delta <= -0.08
                ? "decreasing"
                : "stable",
      };
    });

  const nextScore =
    earlyWarning?.next_week_score ??
    riskLevelToChartScore(earlyWarning?.next_week_risk);
  const week2Score = riskLevelToChartScore(earlyWarning?.week2_risk);
  const projectedScores = [nextScore, week2Score].filter(
    (value): value is number => value != null
  );
  const monthlyWithOutlook =
    projectedScores.length > 0
      ? [
          ...monthly,
          {
            month: "AI outlook",
            average:
              projectedScores.reduce((sum, n) => sum + n, 0) /
              projectedScores.length,
            kind: "projection" as const,
          },
        ]
      : monthly;

  const factors =
    latest && mfbi
      ? {
          stress: {
            raw: latest.stress_score,
            normalized: mfbi.normalized_stress,
          },
          workload: {
            raw: latest.academic_workload,
            normalized: mfbi.normalized_workload,
          },
          studyTime: {
            raw: latest.study_time,
            normalized: mfbi.normalized_study_time,
          },
          sleep: {
            raw: latest.sleep_hours,
            normalized: mfbi.normalized_sleep,
          },
        }
      : null;

  return (
    <div className="space-y-6">
      <BurnoutHero
        level={latest?.prediction?.final_prediction ?? mfbi?.burnout_level ?? null}
        mfbiScore={mfbi?.mfbi_score ?? null}
        weekLabel={latest ? `Week ${latest.week_number}` : null}
      >
        <p className="pt-1 text-xs text-muted-foreground">
          {latest?.prediction
            ? `Prediction: ${latest.prediction.selected_model} · DT ${latest.prediction.decision_tree_prediction} / RF ${latest.prediction.random_forest_prediction}`
            : "Prediction: AI Decision Tree + Random Forest early detection"}
        </p>
      </BurnoutHero>

      <BurnoutFactorSection
        factors={factors}
        stressLevel={stressLevel}
        heading="What makes up your burnout score"
        subheading="Your burnout index combines these four factors from your latest weekly monitoring."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly MFBI scores</CardTitle>
            <CardDescription>
              Burnout risk trend by week
              {earlyWarning
                ? ", with next-week ML and week-2 early-warning projections"
                : ""}
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyMfbiTrendChart
              data={weeklyTrend}
              earlyWarning={earlyWarning}
              movementDirection={movementDirection}
              movementDelta={movementDelta}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly burnout trend</CardTitle>
            <CardDescription>
              Average MFBI by month
              {earlyWarning ? ", plus AI early-warning outlook" : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {earlyWarning?.trend &&
            earlyWarning.trend !== "insufficient_history" ? (
              <div className="flex justify-end">
                <p
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-semibold tracking-tight",
                    movementHighlight(earlyWarning.trend)
                  )}
                >
                  AI risk trend:{" "}
                  <span className="capitalize">
                    {earlyWarning.trend.replaceAll("_", " ")}
                  </span>
                  {earlyWarning.next_week_risk || earlyWarning.week2_risk ? (
                    <span className="ml-1 font-medium text-muted-foreground">
                      · Next {earlyWarning.next_week_risk ?? "—"}
                      {earlyWarning.week2_risk
                        ? ` · W+2 ${earlyWarning.week2_risk}`
                        : ""}
                    </span>
                  ) : null}
                </p>
              </div>
            ) : null}

            {monthlyWithOutlook.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No monthly trend yet.
              </p>
            ) : (
              <div className="space-y-3">
                {monthlyWithOutlook.map((item) => {
                  const isProjection = item.kind === "projection";
                  return (
                    <div key={item.month} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span
                          className={cn(
                            isProjection &&
                              "font-medium text-amber-800 dark:text-amber-300"
                          )}
                        >
                          {item.month}
                        </span>
                        <span
                          className={cn(
                            "font-medium tabular-nums",
                            isProjection &&
                              "text-amber-800 dark:text-amber-300"
                          )}
                        >
                          {item.average.toFixed(2)}
                          {isProjection ? " proj." : ""}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            isProjection
                              ? "border border-dashed border-amber-500/70 bg-amber-400/55"
                              : "bg-primary/80"
                          )}
                          style={{
                            width: `${Math.min(item.average * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission history</CardTitle>
          <CardDescription>
            Previous assessments with section scores, MFBI, and predictions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Week</th>
                      <th className="px-2 py-1.5 font-medium">Submitted</th>
                      <th className="px-2 py-1.5 font-medium">Stress</th>
                      <th className="px-2 py-1.5 font-medium">Workload</th>
                      <th className="px-2 py-1.5 font-medium">Study</th>
                      <th className="px-2 py-1.5 font-medium">Sleep Risk</th>
                      <th className="px-2 py-1.5 font-medium">MFBI</th>
                      <th className="px-2 py-1.5 font-medium">Risk</th>
                      <th className="px-2 py-1.5 font-medium">Prediction</th>
                      <th className="px-2 py-1.5 text-right font-medium">
                        Answers
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((row) => {
                      const result = unwrapMfbi(row);
                      const isOpen = openId === row.monitoring_id;
                      return (
                        <Fragment key={row.monitoring_id}>
                          <tr className="border-b last:border-0">
                            <td className="px-2 py-1.5">W{row.week_number}</td>
                            <td className="px-2 py-1.5">
                              {row.monitoring_date
                                ? new Date(row.monitoring_date).toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-2 py-1.5 tabular-nums">
                              {scoreOverMax(row.stress_score, 40)}
                            </td>
                            <td className="px-2 py-1.5 tabular-nums">
                              {scoreOverMax(row.academic_workload, 10)}
                            </td>
                            <td className="px-2 py-1.5 tabular-nums">
                              {scoreOverMax(row.study_time, 12)}
                            </td>
                            <td className="px-2 py-1.5 tabular-nums">
                              {scoreOverMax(row.sleep_hours, 100)}
                            </td>
                            <td className="px-2 py-1.5 tabular-nums">
                              {result ? result.mfbi_score.toFixed(2) : "—"}
                            </td>
                            <td className="px-2 py-1.5">
                              <RiskLevelText level={result?.burnout_level} />
                            </td>
                            <td className="px-2 py-1.5">
                              <PredictionLabel
                                level={row.prediction?.final_prediction}
                              />
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setOpenId(isOpen ? null : row.monitoring_id)
                                }
                                aria-expanded={isOpen}
                              >
                                View answers
                                <ChevronDownIcon
                                  className={cn(
                                    "size-3.5 transition-transform",
                                    isOpen && "rotate-180"
                                  )}
                                />
                              </Button>
                            </td>
                          </tr>
                          {isOpen ? (
                            <tr className="border-b bg-muted/30 last:border-0">
                              <td colSpan={10} className="px-4 py-4">
                                <AnswersPanel
                                  answers={answers[row.monitoring_id] ?? []}
                                />
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <TablePagination
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                pageSizeOptions={[10]}
                id="submission-history-rows"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
