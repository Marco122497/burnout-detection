"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { downloadCsv, openPrintReport } from "@/lib/instructor/export";
import type { StudentMonitorRow } from "@/lib/instructor/queries";

function tableHtml(headers: string[], rows: string[][]) {
  return `<table>
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>
      ${rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${cell || "—"}</td>`).join("")}</tr>`
        )
        .join("")}
    </tbody>
  </table>`;
}

export function InstructorReportsPanel({
  rows,
  currentWeek,
  departmentName,
}: {
  rows: StudentMonitorRow[];
  currentWeek: number | null;
  departmentName: string | null;
}) {
  function departmentBurnoutRows() {
    return rows.map((r) => [
      r.full_name,
      r.student_number ?? "",
      r.course ?? "",
      String(r.year_level ?? ""),
      r.section ?? "",
      r.stress_level ?? "",
      r.stress_score != null ? String(r.stress_score) : "",
      r.mfbi_score != null ? r.mfbi_score.toFixed(2) : "",
      r.burnout_level ?? "",
      r.prediction ?? "",
    ]);
  }

  function weeklyMonitoringRows() {
    return rows.map((r) => [
      r.full_name,
      r.student_number ?? "",
      r.course ?? "",
      r.section ?? "",
      String(r.year_level ?? ""),
      r.submittedThisWeek ? "Submitted" : "Pending",
      r.academic_workload != null ? String(r.academic_workload) : "",
      r.study_time != null ? String(r.study_time) : "",
      r.sleep_hours != null ? String(r.sleep_hours) : "",
      r.monitoring_date ?? "",
    ]);
  }

  function studentAssessmentRows() {
    return rows.map((r) => [
      r.full_name,
      r.student_number ?? "",
      r.course ?? "",
      String(r.year_level ?? ""),
      r.section ?? "",
      r.stress_score != null ? String(r.stress_score) : "",
      r.stress_level ?? "",
      r.academic_workload != null ? String(r.academic_workload) : "",
      r.study_time != null ? String(r.study_time) : "",
      r.sleep_hours != null ? String(r.sleep_hours) : "",
      r.mfbi_score != null ? r.mfbi_score.toFixed(2) : "",
      r.prediction || r.burnout_level || "",
    ]);
  }

  const deptLabel = departmentName || "Department";

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Department Burnout Report</CardTitle>
          <CardDescription>
            Burnout risk overview for {deptLabel}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() =>
              downloadCsv("department-burnout-report.csv", [
                [
                  "Student",
                  "Student Number",
                  "Course",
                  "Year",
                  "Section",
                  "Stress Level",
                  "Stress Score",
                  "MFBI",
                  "MFBI Risk",
                  "Prediction",
                ],
                ...departmentBurnoutRows(),
              ])
            }
          >
            Export Excel (CSV)
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              openPrintReport(
                `Department Burnout Report — ${deptLabel}`,
                tableHtml(
                  [
                    "Student",
                    "No.",
                    "Course",
                    "Year",
                    "Section",
                    "Stress",
                    "Score",
                    "MFBI",
                    "Risk",
                    "Prediction",
                  ],
                  departmentBurnoutRows()
                )
              )
            }
          >
            Export PDF
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly Monitoring Report</CardTitle>
          <CardDescription>
            Submission status and weekly inputs
            {currentWeek ? ` for week ${currentWeek}` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() =>
              downloadCsv("weekly-monitoring-report.csv", [
                [
                  "Student",
                  "Student Number",
                  "Course",
                  "Section",
                  "Year",
                  "Status",
                  "Workload",
                  "Study",
                  "Sleep",
                  "Date",
                ],
                ...weeklyMonitoringRows(),
              ])
            }
          >
            Export Excel (CSV)
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              openPrintReport(
                "Weekly Monitoring Report",
                tableHtml(
                  [
                    "Student",
                    "No.",
                    "Course",
                    "Section",
                    "Year",
                    "Status",
                    "Workload",
                    "Study",
                    "Sleep",
                    "Date",
                  ],
                  weeklyMonitoringRows()
                )
              )
            }
          >
            Export PDF
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student Assessment Report</CardTitle>
          <CardDescription>
            Full latest assessment snapshot per student.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() =>
              downloadCsv("student-assessment-report.csv", [
                [
                  "Student",
                  "Student Number",
                  "Course",
                  "Year",
                  "Section",
                  "PSS",
                  "Stress Level",
                  "Workload",
                  "Study",
                  "Sleep",
                  "MFBI",
                  "Risk",
                ],
                ...studentAssessmentRows(),
              ])
            }
          >
            Export Excel (CSV)
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              openPrintReport(
                "Student Assessment Report",
                tableHtml(
                  [
                    "Student",
                    "No.",
                    "Course",
                    "Year",
                    "Section",
                    "PSS",
                    "Stress",
                    "Workload",
                    "Study",
                    "Sleep",
                    "MFBI",
                    "Risk",
                  ],
                  studentAssessmentRows()
                )
              )
            }
          >
            Export PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
