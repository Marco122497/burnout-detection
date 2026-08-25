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
      case "summary":
        return {
          title: `Department Burnout Summary — ${deptLabel}`,
          tableTitle: "Department Overview",
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
              "Weekly submissions",
              `${analytics.submittedCount} (${analytics.completionPercent}%)`,
              currentWeek != null ? `Week ${currentWeek}` : "Current week",
            ],
          ],
          total: analytics.totalStudents,
          totalLabel: "Total students",
          emptyMessage: "No department burnout data in this date range.",
        };

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

      case "at-risk":
        return {
          title: `Students at Risk — ${deptLabel}`,
          tableTitle: "At-Risk Students",
          filename: "students-at-risk.csv",
          columns: [
            { key: "student", label: "Student" },
            { key: "mfbi", label: "MFBI Score", align: "right" as const },
            { key: "risk", label: "Risk Level" },
            { key: "trend", label: "Trend" },
            { key: "factor", label: "Main Contributing Factor" },
          ],
          csvHeader: [
            "Student",
            "MFBI Score",
            "Risk Level",
            "Trend",
            "Main Contributing Factor",
          ],
          rows: analytics.attentionStudents.map((s) => [
            s.full_name,
            s.mfbi_score != null ? s.mfbi_score.toFixed(2) : "—",
            s.risk,
            formatTrendLabel(s.early_warning_trend || s.trend),
            s.mainFactor || "—",
          ]),
          total: analytics.attentionStudents.length,
          totalLabel: "Total students at risk",
          emptyMessage: "No students at risk in this date range.",
        };
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
