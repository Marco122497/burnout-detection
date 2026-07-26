import Link from "next/link";

import type {
  StudentHistoryRow,
  StudentMonitorRow,
} from "@/lib/instructor/queries";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StudentAssessmentHistoryView({
  student,
  history,
  backHref = "/instructor/monitoring",
}: {
  student: StudentMonitorRow;
  history: StudentHistoryRow[];
  backHref?: string;
}) {
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
              student.course,
              student.year_level != null ? `Year ${student.year_level}` : null,
              student.section ? `Section ${student.section}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}          </p>
        </div>
        <Link
          href={backHref}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to student list
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Latest PSS</CardDescription>
            <CardTitle className="text-2xl">
              {student.stress_score ?? "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {student.stress_level ?? "No data"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Latest MFBI</CardDescription>
            <CardTitle className="text-2xl">
              {student.mfbi_score != null
                ? student.mfbi_score.toFixed(2)
                : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Burnout risk</CardDescription>
            <CardTitle className="text-2xl">
              {student.prediction || student.burnout_level || "—"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Submissions</CardDescription>
            <CardTitle className="text-2xl">{history.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

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
                    <th className="px-2 py-2 font-medium">Week</th>
                    <th className="px-2 py-2 font-medium">Submitted</th>
                    <th className="px-2 py-2 font-medium">PSS</th>
                    <th className="px-2 py-2 font-medium">Workload</th>
                    <th className="px-2 py-2 font-medium">Study</th>
                    <th className="px-2 py-2 font-medium">Sleep</th>
                    <th className="px-2 py-2 font-medium">MFBI</th>
                    <th className="px-2 py-2 font-medium">Risk</th>
                    <th className="px-2 py-2 font-medium">Prediction</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.monitoring_id} className="border-b last:border-0">
                      <td className="px-2 py-2">W{row.week_number}</td>
                      <td className="px-2 py-2">
                        {row.submitted_at
                          ? new Date(row.submitted_at).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-2 py-2">{row.stress_score}</td>
                      <td className="px-2 py-2">{row.academic_workload}</td>
                      <td className="px-2 py-2">{row.study_time}</td>
                      <td className="px-2 py-2">{row.sleep_hours}</td>
                      <td className="px-2 py-2">
                        {row.mfbi_score != null
                          ? row.mfbi_score.toFixed(2)
                          : "—"}
                      </td>
                      <td className="px-2 py-2">
                        {row.burnout_level ?? "—"}
                      </td>
                      <td className="px-2 py-2">{row.prediction ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
