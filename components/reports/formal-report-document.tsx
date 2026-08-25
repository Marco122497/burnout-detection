const APP_VERSION = "v1.0.0";

export type FormalReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
};

export function FormalReportDocument({
  title,
  tableTitle = "Report Data",
  columns,
  rows,
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

  const totalValue = total ?? rows.length;

  return (
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
        <table
          className={`w-full border-collapse ${
            compact ? "text-[10px]" : "text-[13px]"
          }`}
        >
          <thead>
            <tr className="border-b border-[#111111]">
              {columns.map((col) => (
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
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-8 text-center text-[#6b7280]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-[#e5e7eb]">
                  {columns.map((col, colIndex) => (
                    <td
                      key={col.key}
                      className={`align-middle whitespace-nowrap ${
                        compact ? "py-1.5 pr-2" : "py-2 pr-3"
                      } ${
                        col.align === "right" ? "text-right tabular-nums" : ""
                      }`}
                    >
                      {row[colIndex] || "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

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

      <footer className="report-doc-footer mt-12 flex items-end justify-between gap-4 border-t border-[#d1d5db] pt-2 text-[11px] text-[#6b7280]">
        <span>
          Generated from Burnout Detection System ({APP_VERSION})
        </span>
      </footer>
    </article>
  );
}
