"use client";

import { Fragment, useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  unwrapMfbi,
  type MonitoringAnswer,
  type MonitoringAnswersMap,
  type MonitoringRow,
} from "@/lib/student/queries";
import { cn } from "@/lib/utils";

function riskTone(level: string | null | undefined) {
  switch (level) {
    case "Low":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "Moderate":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "High":
      return "border-orange-200 bg-orange-50 text-orange-950";
    case "Severe":
      return "border-rose-200 bg-rose-50 text-rose-950";
    default:
      return "border-border bg-muted/40 text-muted-foreground";
  }
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
    }));
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

export function BurnoutHistoryView({
  stressLevel,
  stressScore,
  history,
  answers,
}: {
  stressLevel: string | null;
  stressScore: number | null;
  history: MonitoringRow[];
  answers: MonitoringAnswersMap;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const latest = history[0] ?? null;
  const mfbi = latest ? unwrapMfbi(latest) : null;
  const monthly = monthlyBuckets(history);
  const weeklyScores = [...history].reverse();

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className={cn("border", riskTone(stressLevel))}>
          <CardHeader className="pb-2">
            <CardDescription className="text-current/70">
              Stress level
            </CardDescription>
            <CardTitle className="text-2xl">{stressLevel ?? "No data"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-current/70">
            {stressScore != null
              ? `PSS score: ${stressScore}`
              : "Submit weekly monitoring"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Academic workload</CardDescription>
            <CardTitle className="text-2xl">
              {latest ? latest.academic_workload : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Score (0–10)
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Study time</CardDescription>
            <CardTitle className="text-2xl">
              {latest ? `${latest.study_time}h` : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Estimated hours / day
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sleep hours</CardDescription>
            <CardTitle className="text-2xl">
              {latest ? `${latest.sleep_hours}h` : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Estimated hours / night
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>MFBI score</CardDescription>
            <CardTitle className="text-2xl">
              {mfbi ? mfbi.mfbi_score.toFixed(2) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Multi-Factor Burnout Index
          </CardContent>
        </Card>
        <Card
          className={cn(
            "border",
            riskTone(
              latest?.prediction?.final_prediction ?? mfbi?.burnout_level
            )
          )}
        >
          <CardHeader className="pb-2">
            <CardDescription className="text-current/70">
              Predicted burnout risk
            </CardDescription>
            <CardTitle className="text-2xl">
              {latest?.prediction?.final_prediction ??
                mfbi?.burnout_level ??
                "No data"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-current/70">
            {latest?.prediction
              ? `${latest.prediction.selected_model} · DT ${latest.prediction.decision_tree_prediction} / RF ${latest.prediction.random_forest_prediction}`
              : "Decision Tree + Random Forest"}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Weekly MFBI scores</CardTitle>
            <CardDescription>Burnout risk trend by week</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyScores.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No weekly scores yet.
              </p>
            ) : (
              <div className="flex h-44 items-end gap-2">
                {weeklyScores.map((row) => {
                  const score = unwrapMfbi(row)?.mfbi_score ?? 0;
                  const height = Math.max(score * 100, 8);
                  return (
                    <div
                      key={row.monitoring_id}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <div
                        className="w-full rounded-t-md bg-primary/80"
                        style={{ height: `${height}%` }}
                        title={`Week ${row.week_number}: ${score.toFixed(2)}`}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        W{row.week_number}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly burnout trend</CardTitle>
            <CardDescription>Average MFBI by month</CardDescription>
          </CardHeader>
          <CardContent>
            {monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No monthly trend yet.
              </p>
            ) : (
              <div className="space-y-3">
                {monthly.map((item) => (
                  <div key={item.month} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{item.month}</span>
                      <span className="font-medium">
                        {item.average.toFixed(2)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full bg-primary/80"
                        style={{
                          width: `${Math.min(item.average * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
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
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">Week</th>
                    <th className="px-2 py-2 font-medium">Submitted</th>
                    <th className="px-2 py-2 font-medium">PSS</th>
                    <th className="px-2 py-2 font-medium">Workload</th>
                    <th className="px-2 py-2 font-medium">Study</th>
                    <th className="px-2 py-2 font-medium">Sleep</th>
                    <th className="px-2 py-2 font-medium">MFBI</th>
                    <th className="px-2 py-2 font-medium">Risk</th>
                    <th className="px-2 py-2 font-medium">Prediction</th>
                    <th className="px-2 py-2 text-right font-medium">
                      Answers
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const result = unwrapMfbi(row);
                    const isOpen = openId === row.monitoring_id;
                    return (
                      <Fragment key={row.monitoring_id}>
                        <tr className="border-b last:border-0">
                          <td className="px-2 py-2">W{row.week_number}</td>
                          <td className="px-2 py-2">
                            {row.monitoring_date
                              ? new Date(row.monitoring_date).toLocaleString()
                              : "—"}
                          </td>
                          <td className="px-2 py-2">{row.stress_score}</td>
                          <td className="px-2 py-2">{row.academic_workload}</td>
                          <td className="px-2 py-2">{row.study_time}</td>
                          <td className="px-2 py-2">{row.sleep_hours}</td>
                          <td className="px-2 py-2">
                            {result ? result.mfbi_score.toFixed(2) : "—"}
                          </td>
                          <td className="px-2 py-2">
                            {result?.burnout_level ?? "—"}
                          </td>
                          <td className="px-2 py-2">
                            {row.prediction?.final_prediction ?? "—"}
                          </td>
                          <td className="px-2 py-2 text-right">
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
