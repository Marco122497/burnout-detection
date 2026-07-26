"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { downloadCsv, openPrintReport } from "@/lib/instructor/export";
import type {
  GuidanceStudentRow,
  InstructorMonitoringRow,
} from "@/lib/guidance/monitoring";
import type { Department } from "@/lib/auth/roles";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

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

export function GuidanceReportsPanel({
  rows,
  instructors,
  departments,
  currentWeek,
}: {
  rows: GuidanceStudentRow[];
  instructors: InstructorMonitoringRow[];
  departments: Department[];
  currentWeek: number | null;
}) {
  const [departmentId, setDepartmentId] = useState("");
  const [studentId, setStudentId] = useState("");

  const departmentRows = useMemo(() => {
    if (!departmentId) return rows;
    return rows.filter((r) => String(r.department_id) === departmentId);
  }, [rows, departmentId]);

  const selectedDepartment = departments.find(
    (d) => String(d.department_id) === departmentId
  );

  const studentOptions = useMemo(
    () =>
      [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [rows]
  );

  const selectedStudent = rows.find((r) => r.id === studentId);

  function universityRows() {
    return rows.map((r) => [
      r.full_name,
      r.student_number ?? "",
      r.department_name ?? "",
      r.course ?? "",
      String(r.year_level ?? ""),
      r.section ?? "",
      r.stress_level ?? "",
      r.stress_score != null ? String(r.stress_score) : "",
      r.mfbi_score != null ? r.mfbi_score.toFixed(2) : "",
      r.prediction || r.burnout_level || "",
    ]);
  }

  function departmentBurnoutRows() {
    return departmentRows.map((r) => [
      r.full_name,
      r.student_number ?? "",
      r.course ?? "",
      String(r.year_level ?? ""),
      r.section ?? "",
      r.stress_level ?? "",
      r.stress_score != null ? String(r.stress_score) : "",
      r.mfbi_score != null ? r.mfbi_score.toFixed(2) : "",
      r.prediction || r.burnout_level || "",
    ]);
  }

  function weeklyRows() {
    return rows.map((r) => [
      r.full_name,
      r.student_number ?? "",
      r.department_name ?? "",
      r.section ?? "",
      String(r.year_level ?? ""),
      r.submittedThisWeek ? "Submitted" : "Pending",
      r.academic_workload != null ? String(r.academic_workload) : "",
      r.study_time != null ? String(r.study_time) : "",
      r.sleep_hours != null ? String(r.sleep_hours) : "",
      r.monitoring_date ?? "",
    ]);
  }

  function instructorRows() {
    return instructors.map((r) => [
      r.full_name,
      r.department_name ?? "",
      r.is_active ? "Active" : "Inactive",
      String(r.student_count),
      String(r.submitted_count),
      String(r.high_risk_count),
      r.average_mfbi != null ? r.average_mfbi.toFixed(2) : "",
    ]);
  }

  function studentHistorySnapshot() {
    if (!selectedStudent) return [] as string[][];
    return [
      [
        selectedStudent.full_name,
        selectedStudent.student_number ?? "",
        selectedStudent.department_name ?? "",
        String(selectedStudent.year_level ?? ""),
        selectedStudent.section ?? "",
        selectedStudent.stress_score != null
          ? String(selectedStudent.stress_score)
          : "",
        selectedStudent.stress_level ?? "",
        selectedStudent.academic_workload != null
          ? String(selectedStudent.academic_workload)
          : "",
        selectedStudent.study_time != null
          ? String(selectedStudent.study_time)
          : "",
        selectedStudent.sleep_hours != null
          ? String(selectedStudent.sleep_hours)
          : "",
        selectedStudent.mfbi_score != null
          ? selectedStudent.mfbi_score.toFixed(2)
          : "",
        selectedStudent.prediction || selectedStudent.burnout_level || "",
        selectedStudent.monitoring_date ?? "",
      ],
    ];
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>University Burnout Report</CardTitle>
            <CardDescription>
              All students and latest burnout indicators.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() =>
                downloadCsv("university-burnout-report.csv", [
                  [
                    "Student",
                    "Student Number",
                    "Department",
                    "Course",
                    "Year",
                    "Section",
                    "Stress Level",
                    "Stress Score",
                    "MFBI",
                    "Risk",
                  ],
                  ...universityRows(),
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
                  "University Burnout Report",
                  tableHtml(
                    [
                      "Student",
                      "No.",
                      "Department",
                      "Course",
                      "Year",
                      "Section",
                      "Stress",
                      "Score",
                      "MFBI",
                      "Risk",
                    ],
                    universityRows()
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
            <CardTitle>Department Burnout Report</CardTitle>
            <CardDescription>
              Filter by department, then export.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="department_id">Department</Label>
              <select
                id="department_id"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className={selectClassName}
              >
                <option value="">All departments</option>
                {departments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.department_code} — {dept.department_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
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
                      "Risk",
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
                    `Department Burnout Report${
                      selectedDepartment
                        ? ` — ${selectedDepartment.department_name}`
                        : ""
                    }`,
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
                      ],
                      departmentBurnoutRows()
                    )
                  )
                }
              >
                Export PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student Burnout History</CardTitle>
            <CardDescription>
              Latest assessment snapshot for one student. Open monitoring for
              full week-by-week history.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="student_id">Student</Label>
              <select
                id="student_id"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className={selectClassName}
              >
                <option value="">Select student</option>
                {studentOptions.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name}
                    {student.student_number
                      ? ` (${student.student_number})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!selectedStudent}
                onClick={() =>
                  downloadCsv("student-burnout-history.csv", [
                    [
                      "Student",
                      "Student Number",
                      "Department",
                      "Year",
                      "Section",
                      "PSS",
                      "Stress Level",
                      "Workload",
                      "Study",
                      "Sleep",
                      "MFBI",
                      "Risk",
                      "Date",
                    ],
                    ...studentHistorySnapshot(),
                  ])
                }
              >
                Export Excel (CSV)
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedStudent}
                onClick={() =>
                  openPrintReport(
                    `Student Burnout History — ${selectedStudent?.full_name ?? ""}`,
                    tableHtml(
                      [
                        "Student",
                        "No.",
                        "Department",
                        "Year",
                        "Section",
                        "PSS",
                        "Stress",
                        "Workload",
                        "Study",
                        "Sleep",
                        "MFBI",
                        "Risk",
                        "Date",
                      ],
                      studentHistorySnapshot()
                    )
                  )
                }
              >
                Export PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Monitoring Report</CardTitle>
            <CardDescription>
              Submission status
              {currentWeek ? ` for week ${currentWeek}` : ""} across the
              university.
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
                    "Department",
                    "Section",
                    "Year",
                    "Status",
                    "Workload",
                    "Study",
                    "Sleep",
                    "Date",
                  ],
                  ...weeklyRows(),
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
                      "Department",
                      "Section",
                      "Year",
                      "Status",
                      "Workload",
                      "Study",
                      "Sleep",
                      "Date",
                    ],
                    weeklyRows()
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
            <CardTitle>Instructor Monitoring Report</CardTitle>
            <CardDescription>
              Instructor coverage and department risk summary.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() =>
                downloadCsv("instructor-monitoring-report.csv", [
                  [
                    "Instructor",
                    "Department",
                    "Status",
                    "Students",
                    "Submitted",
                    "High Risk",
                    "Avg MFBI",
                  ],
                  ...instructorRows(),
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
                  "Instructor Monitoring Report",
                  tableHtml(
                    [
                      "Instructor",
                      "Department",
                      "Status",
                      "Students",
                      "Submitted",
                      "High Risk",
                      "Avg MFBI",
                    ],
                    instructorRows()
                  )
                )
              }
            >
              Export PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
