"use client";

import { useMemo } from "react";

import { FormalReportDocument } from "@/components/reports/formal-report-document";
import { ReportExportButtons } from "@/components/reports/report-export-buttons";
import { ReportFilters } from "@/components/reports/report-filters";
import {
  getInstructorAnalytics,
  type StudentMonitorRow,
} from "@/lib/instructor/queries";
import {
  INSTRUCTOR_REPORT_TYPES,
  type InstructorReportType,
} from "@/lib/report-types";
import {
  filterRowsByMonitoringDate,
  formatReportPeriodLabel,
} from "@/lib/reports-range";
import { formatYearLevel } from "@/lib/utils";
import { formatMfbiScore } from "@/lib/student/mfbi";
import {
  GENDER_HIGHLIGHT_COLUMNS,
  GENDER_VARIABLE_COLUMNS,
  genderVariableHighlightRows,
  genderVariableSectionGroups,
} from "@/lib/reports/gender-risk";

type WeeklyTrend = {
  week: number;
  average: number;
  count: number;
  lowCount?: number;
  moderateCount?: number;
  highCount?: number;
};

function formatTrendLabel(trend: string | null | undefined) {
  if (!trend) return "Stable";
  const value = trend.toLowerCase();
  if (value === "up" || value.includes("increas") || value.includes("worsen")) {
    return "Increasing";
  }
  if (
    value === "down" ||
    value.includes("decreas") ||
    value.includes("improv")
  ) {
    return "Decreasing";
  }
  if (value === "stable") return "Stable";
  return trend;
}

function overallTrendDirection(weeklyTrends: WeeklyTrend[]) {
  if (weeklyTrends.length < 2) return "Insufficient weekly data";
  const previous = weeklyTrends[weeklyTrends.length - 2];
  const latest = weeklyTrends[weeklyTrends.length - 1];
  const delta = latest.average - previous.average;
  if (delta > 0.03) {
    return `Increasing (+${delta.toFixed(2)} from Week ${previous.week} to Week ${latest.week})`;
  }
  if (delta < -0.03) {
    return `Decreasing (${delta.toFixed(2)} from Week ${previous.week} to Week ${latest.week})`;
  }
  return `Stable (Week ${previous.week} → Week ${latest.week})`;
}

type AttentionStudent = {
  full_name: string;
  year_level: number | null;
  mfbi_score: number | null;
  risk: string;
  early_warning_trend?: string | null;
  trend?: string | null;
  mainFactor?: string;
};

function groupAttentionStudentsByYearLevel(
  students: AttentionStudent[],
  yearLevels: number[] = []
) {
  const map = new Map<number | "unassigned", AttentionStudent[]>();

  for (const year of yearLevels) {
    map.set(year, []);
  }

  for (const student of students) {
    const key = student.year_level ?? "unassigned";
    const list = map.get(key) ?? [];
    list.push(student);
    map.set(key, list);
  }

  const orderedYears = [
    ...yearLevels,
    ...[...map.keys()].filter(
      (key): key is number =>
        typeof key === "number" && !yearLevels.includes(key)
    ),
  ].sort((a, b) => a - b);

  const sections = orderedYears.map((year) => {
    const group = map.get(year) ?? [];
    return {
      title: formatYearLevel(year),
      rows: [...group]
        .sort((a, b) => (b.mfbi_score ?? 0) - (a.mfbi_score ?? 0))
        .map((student, index) => [
          String(index + 1),
          student.full_name,
          student.mfbi_score != null ? formatMfbiScore(student.mfbi_score) : "—",
          student.risk,
          formatTrendLabel(student.early_warning_trend || student.trend),
          student.mainFactor || "—",
        ]),
    };
  });

  const unassigned = map.get("unassigned") ?? [];
  if (unassigned.length > 0) {
    sections.push({
      title: "Unassigned Year Level",
      rows: [...unassigned]
        .sort((a, b) => (b.mfbi_score ?? 0) - (a.mfbi_score ?? 0))
        .map((student, index) => [
          String(index + 1),
          student.full_name,
          student.mfbi_score != null ? formatMfbiScore(student.mfbi_score) : "—",
          student.risk,
          formatTrendLabel(student.early_warning_trend || student.trend),
          student.mainFactor || "—",
        ]),
    });
  }

  return sections;
}

export function InstructorReportsPanel({
  rows,
  weeklyTrends = [],
  currentWeek,
  departmentName,
  reportType,
  from,
  to,
  preparedBy,
  preparedRole = "Instructor",
}: {
  rows: StudentMonitorRow[];
  weeklyTrends?: WeeklyTrend[];
  currentWeek: number | null;
  departmentName: string | null;
  reportType: InstructorReportType;
  from: string;
  to: string;
  preparedBy?: string;
  preparedRole?: string;
}) {
  const generatedAt = useMemo(() => new Date(), []);
  const deptLabel = departmentName || "Department";
  const periodLabel = formatReportPeriodLabel(from, to);
  const filteredRows = useMemo(
    () => filterRowsByMonitoringDate(rows, from, to),
    [rows, from, to]
  );
  const analytics = useMemo(
    () => getInstructorAnalytics(filteredRows, weeklyTrends),
    [filteredRows, weeklyTrends]
  );

  const report = useMemo(() => {
    const low = analytics.riskOverview.find((r) => r.label === "Low");
    const moderate = analytics.riskOverview.find((r) => r.label === "Moderate");
    const high = analytics.riskOverview.find((r) => r.label === "High");

    switch (reportType) {
      case "year-level":
        return {
          title: `Burnout by Year Level — ${deptLabel}`,
          tableTitle: "Year Level Risk Overview",
          filename: "burnout-by-year-level.csv",
          columns: [
            { key: "year", label: "Year Level" },
            { key: "students", label: "Students", align: "right" as const },
            { key: "monitored", label: "Monitored", align: "right" as const },
            { key: "low", label: "Low", align: "right" as const },
            { key: "moderate", label: "Moderate", align: "right" as const },
            { key: "high", label: "High", align: "right" as const },
            { key: "submitted", label: "Submitted", align: "right" as const },
          ],
          csvHeader: [
            "Year Level",
            "Students",
            "Monitored",
            "Low",
            "Moderate",
            "High",
            "Submitted",
          ],
          rows: analytics.yearStats.map((item) => [
            formatYearLevel(item.year_level),
            String(item.total),
            String(item.monitored),
            String(item.low),
            String(item.moderate),
            String(item.high),
            String(item.submitted),
          ]),
          total: analytics.yearStats.length,
          totalLabel: "Total year levels",
          emptyMessage: "No year level burnout data in this date range.",
        };

      case "summary":
        return {
          title: `Department Summary by Year Level — ${deptLabel}`,
          tableTitle: "Department Overview (Sections Combined per Year Level)",
          filename: "department-burnout-summary.csv",
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
              String(analytics.monitoredCount),
              "Latest burnout classification available",
            ],
            [
              "Low risk",
              `${low?.count ?? 0} (${low?.percent ?? 0}%)`,
              "Percentage of classified students",
            ],
            [
              "Moderate risk",
              `${moderate?.count ?? 0} (${moderate?.percent ?? 0}%)`,
              "Percentage of classified students",
            ],
            [
              "High risk",
              `${high?.count ?? 0} (${high?.percent ?? 0}%)`,
              "Percentage of classified students",
            ],
            [
              "Gender most prone to High burnout",
              analytics.mostProneGender ?? "—",
              analytics.mostProneGenderNote ??
                "Compare Male vs Female High-risk rates",
            ],
            ...(analytics.byGenderVariable ?? []).map((item) => [
              `Most High — ${item.label}`,
              item.mostHighCountGender ?? "Tied / —",
              item.note ?? `${item.mostHighCount} High cases`,
            ]),
            [
              "Weekly submissions",
              `${analytics.submittedCount} (${analytics.completionPercent}%)`,
              currentWeek != null ? `Week ${currentWeek}` : "Current week",
            ],
            ...(analytics.yearStats.length > 0
              ? [
                  ["", "", ""],
                  [
                    "Year levels covered",
                    String(analytics.yearStats.length),
                    "Sections combined per year level",
                  ],
                  ...analytics.yearStats.flatMap((item) => [
                    [
                      `${formatYearLevel(item.year_level)} — students`,
                      String(item.total),
                      `${item.low} Low · ${item.moderate} Moderate · ${item.high} High`,
                    ],
                  ]),
                ]
              : []),
          ],
          total: analytics.totalStudents,
          totalLabel: "Total students",
          emptyMessage: "No department burnout data in this date range.",
        };

      case "gender": {
        const genderSummary = {
          byGender: analytics.byGender ?? [],
          mostProneToHigh: analytics.mostProneGender ?? null,
          mostProneNote: analytics.mostProneGenderNote ?? null,
          byVariable: analytics.byGenderVariable ?? [],
          variableNotes: analytics.genderVariableNotes ?? [],
        };
        return {
          title: `Burnout & Factors by Gender — ${deptLabel}`,
          tableTitle: "Who has the most High counts (Male vs Female)",
          filename: "burnout-factors-by-gender.csv",
          columns: GENDER_HIGHLIGHT_COLUMNS,
          csvHeader: ["Variable", "Most High count", "High count", "Notes"],
          rows: genderVariableHighlightRows(genderSummary),
          sectionGroups: genderVariableSectionGroups(genderSummary),
          sectionGroupColumns: GENDER_VARIABLE_COLUMNS,
          total: analytics.totalStudents,
          totalLabel: "Total students",
          emptyMessage: "No gender factor data in this date range.",
        };
      }

      case "trend": {
        const direction = overallTrendDirection(weeklyTrends);
        const trendRows =
          weeklyTrends.length > 0
            ? weeklyTrends.map((item, index) => {
                const previous = index > 0 ? weeklyTrends[index - 1] : null;
                let change = "—";
                if (previous) {
                  const delta = item.average - previous.average;
                  if (delta > 0.03) change = `Increasing (+${delta.toFixed(2)})`;
                  else if (delta < -0.03)
                    change = `Decreasing (${delta.toFixed(2)})`;
                  else change = "Stable";
                }
                return [
                  `Week ${item.week}`,
                  item.average.toFixed(2),
                  String(item.count),
                  String(item.lowCount ?? 0),
                  String(item.moderateCount ?? 0),
                  String(item.highCount ?? 0),
                  change,
                ];
              })
            : [];

        return {
          title: `Burnout Trend — ${deptLabel}`,
          tableTitle: "Weekly MFBI Trend",
          filename: "burnout-trend.csv",
          columns: [
            { key: "week", label: "Week" },
            { key: "mfbi", label: "Avg MFBI", align: "right" as const },
            { key: "count", label: "Students", align: "right" as const },
            { key: "low", label: "Low", align: "right" as const },
            { key: "moderate", label: "Moderate", align: "right" as const },
            { key: "high", label: "High", align: "right" as const },
            { key: "change", label: "Change" },
          ],
          csvHeader: [
            "Week",
            "Avg MFBI",
            "Students",
            "Low",
            "Moderate",
            "High",
            "Change",
          ],
          rows:
            trendRows.length > 0
              ? [
                  ...trendRows,
                  [
                    "Overall direction",
                    weeklyTrends.at(-1)?.average.toFixed(2) ?? "—",
                    "",
                    "",
                    "",
                    "",
                    direction,
                  ],
                ]
              : [],
          total: weeklyTrends.length,
          totalLabel: "Total weeks",
          emptyMessage:
            "No weekly MFBI trend data in this date range.",
        };
      }

      case "at-risk": {
        const atRiskSections = groupAttentionStudentsByYearLevel(
          analytics.attentionStudents,
          analytics.yearStats.map((item) => item.year_level)
        );

        return {
          title: `High-Risk Students by Year Level — ${deptLabel}`,
          tableTitle: "High-Risk Students by Year Level",
          filename: "high-risk-students-by-year-level.csv",
          columns: [
            { key: "no", label: "No.", align: "right" as const },
            { key: "student", label: "Student" },
            { key: "mfbi", label: "MFBI Score", align: "right" as const },
            { key: "risk", label: "Risk Level" },
            { key: "trend", label: "Trend" },
            { key: "factor", label: "Main Contributing Factor" },
          ],
          csvHeader: [
            "Year Level",
            "No.",
            "Student",
            "MFBI Score",
            "Risk Level",
            "Trend",
            "Main Contributing Factor",
          ],
          rows: atRiskSections.flatMap((section) =>
            section.rows.map((row) => [section.title, ...row])
          ),
          sections: atRiskSections,
          total: analytics.attentionStudents.length,
          totalLabel: "Total high-risk students",
          emptyMessage: "No high-risk students in this date range.",
        };
      }
    }
  }, [
    reportType,
    analytics,
    weeklyTrends,
    currentWeek,
    deptLabel,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <ReportFilters
          type={reportType}
          from={from}
          to={to}
          basePath="/instructor/reports"
          types={INSTRUCTOR_REPORT_TYPES}
        />
        <ReportExportButtons title={report.title} />
      </div>

      <FormalReportDocument
        title={report.title}
        tableTitle={report.tableTitle}
        columns={report.columns}
        rows={report.rows}
        sections={"sections" in report ? report.sections : undefined}
        sectionGroups={
          "sectionGroups" in report ? report.sectionGroups : undefined
        }
        sectionGroupColumns={
          "sectionGroupColumns" in report
            ? report.sectionGroupColumns
            : undefined
        }
        generatedBy={preparedBy || preparedRole}
        generatedRole={preparedRole}
        generatedAt={generatedAt}
        notedByName="Guidance Counselor"
        notedByRole="Guidance Counselor"
        periodLabel={periodLabel}
        total={report.total}
        totalLabel={report.totalLabel}
        emptyMessage={report.emptyMessage}
      />
    </div>
  );
}
