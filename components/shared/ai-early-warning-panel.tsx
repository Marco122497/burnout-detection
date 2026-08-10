"use client";

import { AlertTriangleIcon, BrainCircuitIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ModelEvaluationSnapshot } from "@/lib/guidance/model-metrics";
import { cn, formatYearLevel } from "@/lib/utils";

export type AiEarlyWarningRow = {
  id: string;
  full_name: string;
  student_number: string | null;
  course?: string | null;
  classLabel?: string | null;
  year_level: number | null;
  mfbi_score: number | null;
  current_risk: string;
  next_week_risk: string | null;
  week2_risk: string | null;
  trend: string | null;
};

function riskTone(level: string | null | undefined) {
  if (!level) return "text-muted-foreground";
  if (level.includes("High") || level.includes("Severe")) {
    return "text-orange-800 dark:text-orange-400";
  }
  if (level.includes("Moderate")) {
    return "text-amber-800 dark:text-amber-400";
  }
  if (level.includes("Low")) {
    return "text-emerald-700 dark:text-emerald-400";
  }
  return "text-muted-foreground";
}

export function AiEarlyWarningOverviewCards({
  earlyWarningCount,
  nextWeekHighCount,
  week2HighCount,
}: {
  earlyWarningCount: number;
  nextWeekHighCount: number;
  week2HighCount: number;
}) {
  return (
    <>
      <Card className="border-amber-300/70 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardHeader className="gap-1 py-1">
          <CardDescription className="text-xs font-medium tracking-wide uppercase">
            AI Early Warnings
          </CardDescription>
          <CardTitle className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight tabular-nums text-amber-900 dark:text-amber-300">
            {earlyWarningCount}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Rising / projected elevated risk
          </p>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="gap-1 py-1">
          <CardDescription className="text-xs font-medium tracking-wide uppercase">
            Next-week High
          </CardDescription>
          <CardTitle className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight tabular-nums">
            {nextWeekHighCount}
          </CardTitle>
          <p className="text-xs text-muted-foreground">ML early detection</p>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="gap-1 py-1">
          <CardDescription className="text-xs font-medium tracking-wide uppercase">
            Week-2 High
          </CardDescription>
          <CardTitle className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight tabular-nums">
            {week2HighCount}
          </CardTitle>
          <p className="text-xs text-muted-foreground">Trend projection</p>
        </CardHeader>
      </Card>
    </>
  );
}

export function AiEarlyWarningStudentsCard({
  students,
  title = "AI Early Warning Students",
}: {
  students: AiEarlyWarningRow[];
  title?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangleIcon className="size-4" />
          {title}
        </CardTitle>
        <CardDescription>
          Students flagged by next-week ML risk, week-2 projection, or increasing
          MFBI trend. Not a medical diagnosis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No AI early-warning flags in the latest monitoring window.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Student</th>
                  <th className="px-2 py-1.5 font-medium">Current</th>
                  <th className="px-2 py-1.5 font-medium">Next week</th>
                  <th className="px-2 py-1.5 font-medium">Week 2</th>
                  <th className="px-2 py-1.5 font-medium">Trend</th>
                  <th className="px-2 py-1.5 font-medium">MFBI</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b last:border-0">
                    <td className="px-2 py-2">
                      <p className="font-medium">{student.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.student_number ?? "—"}
                        {student.classLabel
                          ? ` · ${student.classLabel}`
                          : student.course
                            ? ` · ${student.course}`
                            : ""}
                        {student.year_level != null
                          ? ` · ${formatYearLevel(student.year_level)}`
                          : ""}
                      </p>
                    </td>
                    <td className={cn("px-2 py-2 font-medium", riskTone(student.current_risk))}>
                      {student.current_risk}
                    </td>
                    <td className={cn("px-2 py-2 font-medium", riskTone(student.next_week_risk))}>
                      {student.next_week_risk ?? "—"}
                    </td>
                    <td className={cn("px-2 py-2 font-medium", riskTone(student.week2_risk))}>
                      {student.week2_risk ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {(student.trend ?? "—").replaceAll("_", " ")}
                    </td>
                    <td className="px-2 py-2 tabular-nums">
                      {student.mfbi_score != null
                        ? student.mfbi_score.toFixed(2)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AiModelStatusCard({
  modelEvaluation,
  aiHealthy,
}: {
  modelEvaluation: ModelEvaluationSnapshot;
  aiHealthy: boolean;
}) {
  const rf = modelEvaluation.randomForest;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BrainCircuitIcon className="size-4" />
          AI Model Status
        </CardTitle>
        <CardDescription>
          Live service health and trained evaluation (
          {modelEvaluation.modelVersion}
          {modelEvaluation.source === "unavailable"
            ? " — run npm run train"
            : ""}
          ).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Service</span>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-medium",
              aiHealthy
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-amber-800 dark:text-amber-400"
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                aiHealthy ? "bg-emerald-600" : "bg-amber-600"
              )}
            />
            {aiHealthy ? "Online" : "Offline / fallback"}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Model</span>
          <span className="font-medium">{rf.label}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">Training</span>
          <span className="font-medium">
            {modelEvaluation.source === "trained" ? "Ready" : "Awaiting train"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Accuracy</p>
            <p className="font-medium tabular-nums">
              {(rf.accuracy * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">F1</p>
            <p className="font-medium tabular-nums">
              {(rf.f1 * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
