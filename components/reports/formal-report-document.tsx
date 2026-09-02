import { formatAppFooterLabel } from "@/lib/app-meta";
import { ReportPrintStyles } from "@/components/reports/report-print-styles";

export type FormalReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
};

export type FormalReportSection = {
  title: string;
  rows: string[][];
};

export type FormalReportSectionGroup = {
  title: string;
  rows?: string[][];
  sections?: FormalReportSection[];
};

export function FormalReportDocument({
  title,
  tableTitle = "Report Data",
  columns,
  rows,
  sections,
  sectionGroups,
  sectionGroupColumns,
  generatedBy,
  generatedRole = "Staff",
  generatedAt,
  notedByName = "School Administrator",
  notedByRole = "School Administrator",
  periodLabel,
  totalLabel = "Total",
  total,
  compact = false,
  emptyMessage = "No records found for this report.",
}: {
  title: string;
  tableTitle?: string;
  columns: FormalReportColumn[];
  rows: string[][];
  sections?: FormalReportSection[];
  sectionGroups?: FormalReportSectionGroup[];
  sectionGroupColumns?: FormalReportColumn[];
  generatedBy: string;
  generatedRole?: string;
  generatedAt: Date;
  notedByName?: string;
  notedByRole?: string;
  periodLabel?: string;
  totalLabel?: string;
  total?: string | number;
  compact?: boolean;
  emptyMessage?: string;
}) {
  const preparedDate = generatedAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sectionRowCount =
    sections?.reduce((sum, section) => sum + section.rows.length, 0) ?? 0;
  const sectionGroupRowCount =
    sectionGroups?.reduce((sum, group) => {
      const groupRows =
        group.rows?.length ??
        group.sections?.reduce(
          (sectionSum, section) => sectionSum + section.rows.length,
          0
        ) ??
        0;
      return sum + groupRows;
    }, 0) ?? 0;
  const totalValue =
    total ??
    (sectionGroups
      ? sectionGroupRowCount
      : sections
        ? sectionRowCount
        : rows.length);
  const hasSectionData = sections?.some((section) => section.rows.length > 0);
  const hasSectionGroupData =
    sectionGroups?.some(
      (group) =>
        (group.rows?.length ?? 0) > 0 ||
        group.sections?.some((section) => section.rows.length > 0)
    ) ?? false;

  function renderTableBody(
    tableRows: string[][],
    tableColumns: FormalReportColumn[] = columns
  ) {
    if (tableRows.length === 0) {
      return (
        <tr>
          <td
            colSpan={tableColumns.length}
            className="py-6 text-center text-[#6b7280]"
          >
            No students in this year level.
          </td>
        </tr>
      );
    }

    return tableRows.map((row, rowIndex) => {
      const isTotalRow = row[0] === "Total";
      return (
        <tr
          key={rowIndex}
          className={
            isTotalRow
              ? "border-t-2 border-[#111111] bg-[#f9fafb] font-semibold text-[#111111]"
              : "border-b border-[#e5e7eb]"
          }
        >
          {tableColumns.map((col, colIndex) => (
            <td
              key={col.key}
              className={`align-middle whitespace-nowrap ${
                compact ? "py-1.5 pr-2" : "py-2 pr-3"
              } ${col.align === "right" ? "text-right tabular-nums" : ""}`}
            >
              {row[colIndex] || "—"}
            </td>
          ))}
        </tr>
      );
    });
  }

  function renderTable(
    tableRows: string[][],
    tableColumns: FormalReportColumn[] = columns
  ) {
    return (
      <table
        className={`w-full border-collapse ${
          compact ? "text-[10px]" : "text-[13px]"
        }`}
      >
        <thead>
          <tr className="border-b border-[#111111]">
            {tableColumns.map((col) => (
              <th
                key={col.key}
                className={`pr-2 text-left font-medium uppercase text-[#6b7280] ${
                  compact
                    ? "py-1.5 text-[8px] tracking-[0.08em]"
                    : "py-2 pr-3 text-[10px] tracking-[0.16em]"
                } ${col.align === "right" ? "text-right" : ""}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{renderTableBody(tableRows, tableColumns)}</tbody>
      </table>
    );
  }

  function renderSectionGroups(
    groups: FormalReportSectionGroup[],
    tableColumns: FormalReportColumn[] = sectionGroupColumns ?? columns
  ) {
    return (
      <div className="space-y-10">
        {groups.map((group) => (
          <div key={group.title} className="report-keep">
            <h4 className="mb-3 border-b border-[#111111] pb-1 text-[13px] font-semibold tracking-[0.08em] text-[#111111] uppercase">
              {group.title}
            </h4>
            {group.rows ? renderTable(group.rows, tableColumns) : null}
            {group.sections ? (
              <div className="space-y-6">
                {group.sections.map((section) => (
                  <div key={`${group.title}-${section.title}`}>
                    <h5 className="mb-2 border-b border-[#d1d5db] pb-1 text-[12px] font-semibold tracking-[0.08em] text-[#111111] uppercase">
                      {section.title}
                      <span className="ml-2 font-normal normal-case tracking-normal text-[#6b7280]">
                        ({section.rows.length} student
                        {section.rows.length === 1 ? "" : "s"})
                      </span>
                    </h5>
                    {renderTable(section.rows, tableColumns)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  const hasTableContent =
    rows.length > 0 ||
    hasSectionData ||
    hasSectionGroupData ||
    (sectionGroups?.length ?? 0) > 0;

  return (
    <>
      <ReportPrintStyles footerLabel={formatAppFooterLabel()} />
      <article
      id="report-print-area"
      className="formal-report mx-auto bg-white text-[#111111]"
    >
      <header>
        <div className="mx-auto flex items-center justify-center gap-3">
          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Burnout Detection System"
              width={64}
              height={64}
              className="size-full object-contain"
            />
          </div>

          <div className="text-center">
            <p className="font-[family-name:var(--font-display)] text-[17px] font-bold tracking-[0.02em] text-[#111111] uppercase">
              Burnout Detection System
            </p>
            <p className="mt-0.5 text-[12px] italic text-[#374151]">
              Student wellness & early intervention
            </p>
            <p className="mt-1 text-[11px] text-[#4b5563]">
              Guidance · Student Burnout Monitoring
            </p>
          </div>

          <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              width={64}
              height={64}
              className="size-full object-contain"
            />
          </div>
        </div>

        <p className="mt-4 text-center text-[15px] font-semibold tracking-[0.12em] text-[#111111] uppercase">
          {title}
        </p>

        {periodLabel ? (
          <p className="mt-2 text-center text-[12px] text-[#4b5563]">
            Period: {periodLabel}
          </p>
        ) : null}

        <div className="mt-5 border-b border-[#111111]" />
      </header>

      <section className="mt-6">
        <h3 className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-[#6b7280] uppercase">
          {tableTitle}
        </h3>

        {!hasTableContent ? (
          <p className="py-8 text-center text-[13px] text-[#6b7280]">
            {emptyMessage}
          </p>
        ) : (
          <>
            {rows.length > 0 ? renderTable(rows) : null}
            {sections ? (
              <div className={rows.length > 0 ? "mt-8" : ""}>
                {hasSectionData ? (
                  <div className="space-y-8">
                    {sections.map((section) => (
                      <div key={section.title} className="report-keep">
                        <h4 className="mb-2 border-b border-[#d1d5db] pb-1 text-[12px] font-semibold tracking-[0.08em] text-[#111111] uppercase">
                          {section.title}
                          <span className="ml-2 font-normal normal-case tracking-normal text-[#6b7280]">
                            ({section.rows.length} student
                            {section.rows.length === 1 ? "" : "s"})
                          </span>
                        </h4>
                        {renderTable(section.rows)}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {sectionGroups ? (
              <div
                className={
                  rows.length > 0 || (sections && hasSectionData) ? "mt-8" : ""
                }
              >
                {renderSectionGroups(sectionGroups)}
              </div>
            ) : null}
          </>
        )}

        <p className="mt-4 border-t border-[#111111] pt-3 text-[13px] font-semibold text-[#111111]">
          {totalLabel}:{" "}
          <span className="tabular-nums">{totalValue}</span>
        </p>
      </section>

      <section className="report-keep mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2">
        <div className="text-sm">
          <p className="text-[10px] font-medium tracking-[0.16em] text-[#6b7280] uppercase">
            Prepared by
          </p>
          <div className="mt-10 w-48 border-b border-[#111111]" />
          <p className="mt-2 font-medium uppercase">{generatedBy || "—"}</p>
          <p className="text-[12px] uppercase text-[#4b5563]">
            {generatedRole || "Staff"}
          </p>
          <p className="mt-1 text-[12px] text-[#4b5563]">
            Date: {preparedDate}
          </p>
        </div>
        <div className="text-sm">
          <p className="text-[10px] font-medium tracking-[0.16em] text-[#6b7280] uppercase">
            Noted by
          </p>
          <div className="mt-10 w-48 border-b border-[#111111]" />
          <p className="mt-2 font-medium uppercase">{notedByName}</p>
          <p className="text-[12px] uppercase text-[#4b5563]">{notedByRole}</p>
          <p className="mt-1 text-[12px] text-[#4b5563]">Date: __________</p>
        </div>
      </section>

      <footer className="report-doc-footer report-keep mt-12 flex items-end justify-between gap-4 border-t border-[#d1d5db] pt-2 text-[11px] text-[#6b7280]">
        <span>{formatAppFooterLabel()}</span>
      </footer>
    </article>
    </>
  );
}
