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
import {
  formatMfbiScore,
  mfbiRiskBucket,
} from "@/lib/student/mfbi";
import { formatYearLevel } from "@/lib/utils";

const YEAR_LEVELS = [1, 2, 3, 4] as const;

const DEPARTMENT_YEAR_LEVEL_COLUMNS = [
  { key: "year", label: "Year Level" },
  { key: "students", label: "Students", align: "right" as const },
  { key: "low", label: "Low", align: "right" as const },
  { key: "moderate", label: "Moderate", align: "right" as const },
  { key: "high", label: "High", align: "right" as const },
  { key: "attention", label: "Attention", align: "right" as const },
  { key: "mfbi", label: "Avg MFBI", align: "right" as const },
];

const DEPARTMENT_YEAR_LEVEL_CSV_HEADER = [
  "Department",
  "Year Level",
  "Students",
  "Low",
  "Moderate",
  "High",
  "Requiring Attention",
  "Avg MFBI",
];

type RiskStats = {
  total: number;
  low: number;
  moderate: number;
  high: number;
  scores: number[];
  attention: number;
};

type MfbiRiskBucket = "Low" | "Moderate" | "High";

function rowMfbiRiskBucket(row: GuidanceStudentRow): MfbiRiskBucket | null {
  return mfbiRiskBucket(row.mfbi_score, row.burnout_level);
}

function rowMfbiRiskLabel(row: GuidanceStudentRow) {
  const bucket = rowMfbiRiskBucket(row);
  if (!bucket) return "—";
  if (row.early_warning_attention) return `${bucket} (EW)`;
  return bucket;
}

function interventionRowCells(row: GuidanceStudentRow, rowNumber: number) {
  return [
    String(rowNumber),
    row.full_name,
    row.student_number ?? "",
    rowMfbiRiskLabel(row),
    formatMfbiScore(row.mfbi_score),
    interventionStatus(row),
    followUpStatus(row),
  ];
}

function emptyRiskStats(): RiskStats {
  return {
    total: 0,
    low: 0,
    moderate: 0,
    high: 0,
    scores: [],
    attention: 0,
  };
}

function accumulateRiskStats(entry: RiskStats, row: GuidanceStudentRow) {
  entry.total += 1;
  if (row.mfbi_score != null) entry.scores.push(row.mfbi_score);
  const bucket = rowMfbiRiskBucket(row);
  if (bucket === "Low") entry.low += 1;
  else if (bucket === "Moderate") entry.moderate += 1;
  else if (bucket === "High") entry.high += 1;
  if (bucket === "High" || row.early_warning_attention) {
    entry.attention += 1;
  }
}

function statsToRow(entry: RiskStats, yearLabel: string) {
  const average =
    entry.scores.length > 0
      ? entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
      : null;

  return [
    yearLabel,
    String(entry.total),
    String(entry.low),
    String(entry.moderate),
    String(entry.high),
    String(entry.attention),
    average != null ? average.toFixed(2) : "—",
  ];
}

function getDepartmentNames(
  rows: GuidanceStudentRow[],
  departments: Department[]
) {
  const names = departments.map((department) => department.department_name);
  if (rows.some((row) => !row.department_name)) {
    names.push("Unassigned");
  }
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

function buildDepartmentYearLevelGroups(
  rows: GuidanceStudentRow[],
  departments: Department[]
) {
  return getDepartmentNames(rows, departments).map((department) => {
    const deptRows = rows.filter(
      (row) => (row.department_name || "Unassigned") === department
    );

    const yearRows = YEAR_LEVELS.map((year) => {
      const entry = emptyRiskStats();
      for (const row of deptRows) {
        if (row.year_level !== year) continue;
        accumulateRiskStats(entry, row);
      }
      return statsToRow(entry, formatYearLevel(year));
    });

    const deptTotalEntry = emptyRiskStats();
    for (const row of deptRows) {
      accumulateRiskStats(deptTotalEntry, row);
    }

    const deptTotal = deptRows.length;

    return {
      title: `${department} (${deptTotal} student${deptTotal === 1 ? "" : "s"})`,
      rows: [...yearRows, statsToRow(deptTotalEntry, "Total")],
    };
  });
}

function buildInstitutionalTotalsGroup(rows: GuidanceStudentRow[]) {
  const entry = emptyRiskStats();
  for (const row of rows) {
    accumulateRiskStats(entry, row);
  }

  return {
    title: "Institutional Total (All Departments)",
    rows: [statsToRow(entry, "Total")],
  };
}

function buildInterventionSectionGroups(
  students: GuidanceStudentRow[],
  departments: Department[]
) {
  return getDepartmentNames(students, departments)
    .map((department) => {
      const deptStudents = students.filter(
        (row) => (row.department_name || "Unassigned") === department
      );
      if (deptStudents.length === 0) return null;

      const yearMap = new Map<number | "unassigned", GuidanceStudentRow[]>();
      for (const year of YEAR_LEVELS) {
        yearMap.set(year, []);
      }

      for (const student of deptStudents) {
        const key = student.year_level ?? "unassigned";
        const list = yearMap.get(key) ?? [];
        list.push(student);
        yearMap.set(key, list);
      }

      const sections = YEAR_LEVELS.map((year) => {
        const group = yearMap.get(year) ?? [];
        return {
          title: formatYearLevel(year),
          rows: [...group]
            .sort((a, b) => (b.mfbi_score ?? 0) - (a.mfbi_score ?? 0))
            .map((row, index) => interventionRowCells(row, index + 1)),
        };
      });

      const unassigned = yearMap.get("unassigned") ?? [];
      if (unassigned.length > 0) {
        sections.push({
          title: "Unassigned Year Level",
          rows: [...unassigned]
            .sort((a, b) => (b.mfbi_score ?? 0) - (a.mfbi_score ?? 0))
            .map((row, index) => interventionRowCells(row, index + 1)),
        });
      }

      return {
        title: `${department} (${deptStudents.length} student${
          deptStudents.length === 1 ? "" : "s"
        })`,
        sections,
      };
    })
    .filter((group): group is NonNullable<typeof group> => group != null);
}

function interventionStatus(row: GuidanceStudentRow) {
  const bucket = rowMfbiRiskBucket(row);
  if (row.early_warning_attention && bucket === "High") {
    return "Counseling (EW)";
  }
  if (bucket === "High") return "Counseling rec.";
  if (row.early_warning_attention) return "Early warning";
  if (bucket === "Moderate") return "Monitor";
  return "Routine";
}

function followUpStatus(row: GuidanceStudentRow) {
  if (row.early_warning_attention || rowMfbiRiskBucket(row) === "High") {
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

  const attentionStudents = useMemo(
    () =>
      filteredRows
        .filter(
          (r) =>
            rowMfbiRiskBucket(r) === "High" || r.early_warning_attention
        )
        .sort((a, b) => (b.mfbi_score ?? 0) - (a.mfbi_score ?? 0)),
    [filteredRows]
  );

  const departmentYearLevelGroups = useMemo(
    () => buildDepartmentYearLevelGroups(filteredRows, departments),
    [filteredRows, departments]
  );

  const interventionSectionGroups = useMemo(
    () => buildInterventionSectionGroups(attentionStudents, departments),
    [attentionStudents, departments]
  );

  const report = useMemo(() => {
    const low = analytics.riskOverview.find((r) => r.label === "Low");
    const moderate = analytics.riskOverview.find((r) => r.label === "Moderate");
    const high = analytics.riskOverview.find((r) => r.label === "High");

    switch (reportType) {
      case "year-level": {
        return {
          title: "Burnout by Department & Year Level",
          tableTitle:
            "Department & Year Level Risk Overview (Sections Combined)",
          filename: "burnout-by-department-year-level.csv",
          columns: DEPARTMENT_YEAR_LEVEL_COLUMNS,
          csvHeader: DEPARTMENT_YEAR_LEVEL_CSV_HEADER,
          rows: [],
          sectionGroups: departmentYearLevelGroups,
          total: filteredRows.length,
          totalLabel: "Total students",
          emptyMessage:
            "No department or year level burnout data in this date range.",
        };
      }

      case "institutional":
        return {
          title: "Institutional Summary by Department & Year Level",
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
            [
              "Departments covered",
              String(departmentYearLevelGroups.length),
              "Breakdown by year level follows below",
            ],
          ],
          sectionGroups: [
            ...departmentYearLevelGroups,
            buildInstitutionalTotalsGroup(filteredRows),
          ],
          sectionGroupColumns: DEPARTMENT_YEAR_LEVEL_COLUMNS,
          total: analytics.totalStudents,
          totalLabel: "Total students",
          emptyMessage: "No institutional burnout data in this date range.",
        };

      case "department": {
        return {
          title: "Department Comparison by Year Level",
          tableTitle: "Department Comparison by Year Level",
          filename: "department-comparison-by-year-level.csv",
          columns: DEPARTMENT_YEAR_LEVEL_COLUMNS,
          csvHeader: DEPARTMENT_YEAR_LEVEL_CSV_HEADER,
          rows: [],
          sectionGroups: departmentYearLevelGroups,
          total: departmentYearLevelGroups.length,
          totalLabel: "Total departments",
          emptyMessage: "No department data in this date range.",
        };
      }

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

      case "intervention": {
        return {
          title: "Intervention & Follow-up by Department & Year Level",
          tableTitle: "High-Risk & Attention List",
          filename: "intervention-follow-up-by-department-year-level.csv",
          columns: [
            { key: "no", label: "No.", align: "right" as const },
            { key: "student", label: "Student" },
            { key: "studentNo", label: "Student No." },
            { key: "risk", label: "Risk" },
            { key: "mfbi", label: "MFBI", align: "right" as const },
            { key: "intervention", label: "Intervention" },
            { key: "followup", label: "Follow-up" },
          ],
          csvHeader: [
            "Department",
            "Year Level",
            "No.",
            "Student",
            "Student Number",
            "Risk",
            "MFBI",
            "Intervention",
            "Follow-up",
          ],
          rows: [],
          sectionGroups: interventionSectionGroups,
          total: attentionStudents.length,
          totalLabel: "Total students",
          emptyMessage:
            "No high-risk or early-warning students in this date range.",
        };
      }
    }
  }, [
    reportType,
    analytics,
    attentionStudents,
    departmentYearLevelGroups,
    interventionSectionGroups,
    filteredRows.length,
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
        sectionGroups={
          "sectionGroups" in report ? report.sectionGroups : undefined
        }
        sectionGroupColumns={
          "sectionGroupColumns" in report ? report.sectionGroupColumns : undefined
        }
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
