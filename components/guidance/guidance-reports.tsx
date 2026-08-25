"use client";

import { useMemo } from "react";

import { FormalReportDocument } from "@/components/reports/formal-report-document";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { ReportFilters } from "@/components/reports/report-filters";
import type { Department } from "@/lib/auth/roles";
import {
  getGuidanceAnalytics,
  type GuidanceStudentRow,
} from "@/lib/guidance/monitoring";
import {
  GUIDANCE_REPORT_TYPES,
  type GuidanceReportType,
} from "@/lib/report-types";
import {
  filterRowsByMonitoringDate,
  formatReportPeriodLabel,
} from "@/lib/reports-range";

function riskBucket(level: string | null | undefined) {
  if (!level) return null;
  const n = level.toLowerCase();
  if (n.includes("low")) return "Low" as const;
  if (n.includes("mod")) return "Moderate" as const;
  if (n.includes("high") || n.includes("severe")) return "High" as const;
  return null;
}

function interventionStatus(row: GuidanceStudentRow) {
  const bucket = riskBucket(row.prediction || row.burnout_level);
  if (row.early_warning_attention && bucket === "High") {
    return "Counseling (EW)";
  }
  if (bucket === "High") return "Counseling rec.";
  if (row.early_warning_attention) return "Early warning";
  if (bucket === "Moderate") return "Monitor";
  return "Routine";
}

function followUpStatus(row: GuidanceStudentRow) {
  if (
    row.early_warning_attention ||
    riskBucket(row.prediction || row.burnout_level) === "High"
  ) {
    if (row.submittedThisWeek) return "Pending follow-up";
    return "Overdue — no submit";
  }
  if (!row.monitoring_date) return "No assessment";
  if (row.submittedThisWeek) return "Submitted";
  return "Awaiting submit";
}

export function GuidanceReportsPanel({
  rows,
  departments,
  currentWeek,
  reportType,
  from,
  to,
  preparedBy,
  preparedRole = "Guidance Counselor",
}: {
  rows: GuidanceStudentRow[];
  departments: Department[];
  currentWeek: number | null;
  reportType: GuidanceReportType;
  from: string;
  to: string;
  preparedBy?: string;
  preparedRole?: string;
}) {
  const generatedAt = useMemo(() => new Date(), []);
  const periodLabel = formatReportPeriodLabel(from, to);
  const filteredRows = useMemo(
    () => filterRowsByMonitoringDate(rows, from, to),
    [rows, from, to]
  );
  const analytics = useMemo(
    () => getGuidanceAnalytics(filteredRows),
    [filteredRows]
  );

  const departmentRiskRows = useMemo(() => {
    type DeptStats = {
      total: number;
      low: number;
      moderate: number;
      high: number;
      scores: number[];
      attention: number;
    };

    const emptyStats = (): DeptStats => ({
      total: 0,
      low: 0,
      moderate: 0,
      high: 0,
      scores: [],
      attention: 0,
    });

    const map = new Map<string, DeptStats>();

    // Include every department even when there is no burnout data.
    for (const dept of departments) {
      map.set(dept.department_name, emptyStats());
    }

    for (const row of filteredRows) {
      const label = row.department_name || "Unassigned";
      const entry = map.get(label) ?? emptyStats();
      entry.total += 1;
      if (row.mfbi_score != null) entry.scores.push(row.mfbi_score);
      const bucket = riskBucket(row.prediction || row.burnout_level);
      if (bucket === "Low") entry.low += 1;
      else if (bucket === "Moderate") entry.moderate += 1;
      else if (bucket === "High") entry.high += 1;
      if (bucket === "High" || row.early_warning_attention) {
        entry.attention += 1;
      }
      map.set(label, entry);
    }

    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([department, entry]) => ({
        department,
        ...entry,
        average:
          entry.scores.length > 0
            ? entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
            : null,
      }));
  }, [filteredRows, departments]);

  const attentionStudents = useMemo(
    () =>
      filteredRows
        .filter(
          (r) =>
            riskBucket(r.prediction || r.burnout_level) === "High" ||
            r.early_warning_attention
        )
        .sort((a, b) => (b.mfbi_score ?? 0) - (a.mfbi_score ?? 0)),
    [filteredRows]
  );

  const report = useMemo(() => {
    const low = analytics.riskOverview.find((r) => r.label === "Low");
    const moderate = analytics.riskOverview.find((r) => r.label === "Moderate");
    const high = analytics.riskOverview.find((r) => r.label === "High");

    switch (reportType) {
      case "institutional":
        return {
          title: "Institutional Burnout Summary",
          tableTitle: "Institutional Overview",
          filename: "institutional-burnout-summary.csv",
          columns: [
            { key: "metric", label: "Metric" },
            { key: "value", label: "Value", align: "right" as const },
            { key: "notes", label: "Notes" },
          ],
          csvHeader: ["Metric", "Value", "Notes"],
          rows: [
            [
              "Total students",
              String(analytics.totalStudents),
              "With monitoring in selected period",
            ],
            [
              "Students with risk data",
              String(analytics.classifiedCount),
              "Latest burnout classification available",
            ],
            [
              "Low risk",
              `${low?.count ?? 0} (${low?.percent ?? 0}%)`,
              "Within healthy range",
            ],
            [
              "Moderate risk",
              `${moderate?.count ?? 0} (${moderate?.percent ?? 0}%)`,
              "Monitor and support",
            ],
            [
              "High risk",
              `${high?.count ?? 0} (${high?.percent ?? 0}%)`,
              "Priority for guidance",
            ],
            [
              "Students requiring attention",
              String(attentionStudents.length),
              "High risk and/or AI early warning",
            ],
            [
              "Average MFBI",
              analytics.averageMfbi != null
                ? analytics.averageMfbi.toFixed(2)
                : "—",
              "Institutional burnout index",
            ],
            [
              "Weekly submissions",
              `${analytics.submittedCount} (${analytics.completionPercent}%)`,
              currentWeek != null ? `Week ${currentWeek}` : "Current week",
            ],
          ],
          total: analytics.totalStudents,
          totalLabel: "Total students",
          emptyMessage: "No institutional burnout data in this date range.",
        };

      case "department":
        return {
          title: "Burnout by Department",
          tableTitle: "Department Comparison",
          filename: "burnout-by-department.csv",
          columns: [
            { key: "department", label: "Department" },
            { key: "students", label: "Students", align: "right" as const },
            { key: "low", label: "Low", align: "right" as const },
            { key: "moderate", label: "Moderate", align: "right" as const },
            { key: "high", label: "High", align: "right" as const },
            { key: "attention", label: "Attention", align: "right" as const },
            { key: "mfbi", label: "Avg MFBI", align: "right" as const },
          ],
          csvHeader: [
            "Department",
            "Students",
            "Low",
            "Moderate",
            "High",
            "Requiring Attention",
            "Avg MFBI",
          ],
          rows: departmentRiskRows.map((d) => [
            d.department,
            String(d.total),
            String(d.low),
            String(d.moderate),
            String(d.high),
            String(d.attention),
            d.average != null ? d.average.toFixed(2) : "—",
          ]),
          total: departmentRiskRows.length,
          totalLabel: "Total departments",
          emptyMessage: "No department data in this date range.",
        };

      case "factors": {
        const factorRows = [
          {
            label: "Stress Level",
            average: analytics.averageStress,
            scale: "0–40 (PSS)",
            contribution: analytics.variableContribution.find(
              (f) => f.key === "stress"
            )?.percent,
          },
          {
            label: "Academic Workload",
            average: analytics.averageWorkload,
            scale: "0–10",
            contribution: analytics.variableContribution.find(
              (f) => f.key === "workload"
            )?.percent,
          },
          {
            label: "Study Time",
            average: analytics.averageStudy,
            scale: "hours / day",
            contribution: analytics.variableContribution.find(
              (f) => f.key === "studyTime"
            )?.percent,
          },
          {
            label: "Sleep Hours",
            average: analytics.averageSleep,
            scale: "0–100 sleep risk",
            contribution: analytics.variableContribution.find(
              (f) => f.key === "sleep"
            )?.percent,
          },
        ];

        return {
          title: "Burnout Factors",
          tableTitle: "Contributing Factors",
          filename: "burnout-factors.csv",
          columns: [
            { key: "factor", label: "Factor" },
            { key: "average", label: "Average", align: "right" as const },
            { key: "scale", label: "Scale" },
            {
              key: "contribution",
              label: "Contribution",
              align: "right" as const,
            },
          ],
          csvHeader: ["Factor", "Average", "Scale", "Contribution %"],
          rows: factorRows.map((f) => [
            f.label,
            f.average != null ? f.average.toFixed(2) : "—",
            f.scale,
            f.contribution != null ? `${f.contribution}%` : "—",
          ]),
          total: factorRows.length,
          totalLabel: "Total factors",
          emptyMessage: "No burnout factor averages in this date range.",
        };
      }

      case "intervention":
        return {
          title: "Intervention & Follow-up",
          tableTitle: "High-risk & Attention List",
          filename: "intervention-follow-up.csv",
          columns: [
            { key: "student", label: "Student" },
            { key: "no", label: "No." },
            { key: "department", label: "Dept." },
            { key: "risk", label: "Risk" },
            { key: "mfbi", label: "MFBI", align: "right" as const },
            { key: "intervention", label: "Intervention" },
            { key: "followup", label: "Follow-up" },
          ],
          csvHeader: [
            "Student",
            "Student Number",
            "Department",
            "Risk",
            "MFBI",
            "Intervention",
            "Follow-up",
          ],
          rows: attentionStudents.map((r) => [
            r.full_name,
            r.student_number ?? "",
            r.department_name ?? "",
            r.early_warning_attention
              ? `${r.prediction || r.burnout_level || "Elevated"} (EW)`
              : r.prediction || r.burnout_level || "High",
            r.mfbi_score != null ? r.mfbi_score.toFixed(2) : "—",
            interventionStatus(r),
            followUpStatus(r),
          ]),
          total: attentionStudents.length,
          totalLabel: "Total students",
          emptyMessage:
            "No high-risk or early-warning students in this date range.",
        };
    }
  }, [
    reportType,
    analytics,
    attentionStudents,
    departmentRiskRows,
    currentWeek,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <ReportFilters
          type={reportType}
          from={from}
          to={to}
          basePath="/guidance/reports"
          types={GUIDANCE_REPORT_TYPES}
        />
        <ReportExportButtons title={report.title} />
      </div>

      <FormalReportDocument
        title={report.title}
        tableTitle={report.tableTitle}
        columns={report.columns}
        rows={report.rows}
        generatedBy={preparedBy || preparedRole}
        generatedRole={preparedRole}
        generatedAt={generatedAt}
        notedByName="School Administrator"
        notedByRole="School Administrator"
        periodLabel={periodLabel}
        total={report.total}
        totalLabel={report.totalLabel}
        compact={reportType === "intervention"}
        emptyMessage={report.emptyMessage}
      />
    </div>
  );
}
