"use client";

import { Fragment, useState } from "react";
import { ChevronDownIcon, Loader2 } from "lucide-react";

import type {
  StudentHistoryRow,
  StudentMonitorRow,
} from "@/lib/instructor/queries";
import type {
  MonitoringAnswer,
  MonitoringAnswersMap,
} from "@/lib/student/queries";
import {
  BurnoutFactorSection,
  BurnoutHero,
} from "@/components/shared/burnout-summary";
import {
  BurnoutRiskTrendCard,
  EarlyWarningOutlookCard,
} from "@/components/shared/burnout-outlook";
import {
  PredictionLabel,
  RiskLevelText,
  scoreOverMax,
} from "@/components/shared/risk-display";
import { STUDY_TIME_SCORE_MAX } from "@/lib/student/scale-options";
import { useNavigationPending } from "@/components/layout/navigation-pending";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { parseEarlyWarningRemarks } from "@/lib/student/ai-client";
import { cn, formatYearLevel } from "@/lib/utils";

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

export function StudentAssessmentHistoryView({
  student,
  history,
  answers = {},
  backHref = "/instructor/monitoring",
}: {
  student: StudentMonitorRow & { department_name?: string | null };
  history: StudentHistoryRow[];
  answers?: MonitoringAnswersMap;
  backHref?: string;
}) {
  const { navigate, isPending, pendingHref } = useNavigationPending();
  const [openId, setOpenId] = useState<number | null>(null);
  const latest = history[0] ?? null;
  const backLoading = isPending && pendingHref === backHref;

  const factors =
    latest &&
    latest.normalized_stress != null &&
    latest.normalized_workload != null &&
    latest.normalized_study_time != null &&
    latest.normalized_sleep != null
      ? {
          stress: {
            raw: latest.stress_score,
            normalized: latest.normalized_stress,
          },
          workload: {
            raw: latest.academic_workload,
            normalized: latest.normalized_workload,
          },
          studyTime: {
            raw: latest.study_time,
            normalized: latest.normalized_study_time,
          },
          sleep: {
            raw: latest.sleep_hours,
            normalized: latest.normalized_sleep,
          },
        }
      : null;

  const chronological = [...history].sort(
    (a, b) => a.week_number - b.week_number
  );
  const weeklyTrend = chronological.map((row, index, rows) => {
    const previousScore = index > 0 ? rows[index - 1].mfbi_score : null;
    const delta =
      row.mfbi_score != null && previousScore != null
        ? row.mfbi_score - previousScore
        : null;
    return {
      week: row.week_number,
      score: row.mfbi_score,
      level: row.prediction || row.burnout_level,
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
  const earlyWarning = parseEarlyWarningRemarks(
    latest?.prediction_remarks ?? null
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Student monitoring</p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {student.full_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[
              student.student_number,
              student.department_name || student.course,
              student.year_level != null
                ? formatYearLevel(student.year_level)
                : null,
              student.section ? `Section ${student.section}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={backLoading}
          onClick={() => navigate(backHref)}
        >
          {backLoading ? (
            <>
              <Loader2 className="animate-spin" />
              Loading…
            </>
          ) : (
            "Back to student list"
          )}
        </Button>
      </div>

      <BurnoutHero
        level={student.prediction || student.burnout_level || null}
        mfbiScore={student.mfbi_score}
        weekLabel={
          student.week_number != null ? `Week ${student.week_number}` : null
        }
        description="Based on this student's latest weekly monitoring submission."
      >
        <p className="pt-1 text-xs text-muted-foreground">
          {history.length} submission{history.length === 1 ? "" : "s"}
          {latest?.submitted_at
            ? ` · Last: ${new Date(latest.submitted_at).toLocaleString()}`
            : ""}
        </p>
      </BurnoutHero>

      <BurnoutFactorSection
        factors={factors}
        stressLevel={student.stress_level}
        heading="What makes up the burnout score"
        subheading="The burnout index combines these four factors from the latest weekly monitoring."
      />

      <EarlyWarningOutlookCard
        earlyWarning={earlyWarning}
        mfbiScore={student.mfbi_score}
        burnoutLevel={student.prediction || student.burnout_level || null}
      />

      <BurnoutRiskTrendCard
        data={weeklyTrend}
        earlyWarning={earlyWarning}
        emptyMessage="No weekly monitoring submissions yet."
      />

      <Card>
        <CardHeader>
          <CardTitle>Assessment history</CardTitle>
          <CardDescription>
            Weekly monitoring results for this student.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No weekly monitoring submissions yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
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
                  {history.map((row) => {
                    const isOpen = openId === row.monitoring_id;
                    return (
                      <Fragment key={row.monitoring_id}>
                        <tr className="border-b last:border-0">
                          <td className="px-2 py-1.5">W{row.week_number}</td>
                          <td className="px-2 py-1.5">
                            {row.submitted_at
                              ? new Date(row.submitted_at).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums">
                            {scoreOverMax(row.stress_score, 40)}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums">
                            {scoreOverMax(row.academic_workload, 10)}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums">
                            {scoreOverMax(row.study_time, STUDY_TIME_SCORE_MAX)}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums">
                            {scoreOverMax(row.sleep_hours, 100)}
                          </td>
                          <td className="px-2 py-1.5 tabular-nums">
                            {row.mfbi_score != null
                              ? row.mfbi_score.toFixed(2)
                              : "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            <RiskLevelText
                              level={row.burnout_level}
                              score={row.mfbi_score}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <PredictionLabel level={row.prediction} />
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
