import { formatAppFooterLabel } from "@/lib/app-meta";
import { reportPrintPageCss } from "@/lib/report-print-styles";

export type PrintReportOptions = {
  preparedBy?: string;
  preparedRole?: string;
  notedBy?: string;
  notedByRole?: string;
  /** Extra meta items under the header (Report No., Period, etc.). */
  meta?: { label: string; value: string }[];
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell ?? "";
          if (/[",\n]/.test(value)) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Formal print document styled like SFXA Finance reports (header + signatures). */
export function openPrintReport(
  title: string,
  bodyHtml: string,
  options: PrintReportOptions = {}
) {
  const popup = window.open(
    "",
    "_blank",
    "noopener,noreferrer,width=960,height=720"
  );
  if (!popup) return;

  const generatedAt = new Date();
  const printedLabel = generatedAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const preparedDate = printedLabel;
  const logoSrc = `${window.location.origin}/logo.png`;

  const preparedBy = options.preparedBy?.trim() || "—";
  const preparedRole = options.preparedRole?.trim() || "Staff";
  const notedBy = options.notedBy?.trim() || "Guidance Counselor";
  const notedByRole = options.notedByRole?.trim() || "Guidance Counselor";

  const metaItems = [
    { label: "Prepared by", value: preparedBy },
    { label: "Role", value: preparedRole },
    { label: "Printed", value: printedLabel },
    ...(options.meta ?? []),
  ];

  const metaHtml = metaItems
    .map(
      (item) => `<div class="meta-item">
        <dt>${escapeHtml(item.label)}</dt>
        <dd>${escapeHtml(item.value)}</dd>
      </div>`
    )
    .join("");

  popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #e5e7eb;
      color: #111111;
      font-family: "Aptos Narrow", "Aptos", "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      gap: 8px;
      align-items: center;
      padding: 12px 16px;
      background: #111827;
      color: #fff;
    }
    .toolbar button {
      appearance: none;
      border: 0;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      background: #fff;
      color: #111827;
    }
    .toolbar span {
      font-size: 12px;
      opacity: 0.8;
    }
    .sheet-wrap {
      padding: 24px 16px 40px;
    }
    .formal-report {
      box-sizing: border-box;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 14mm 16mm 20mm;
      color: #111111;
      background: #ffffff;
      box-shadow: 0 1px 8px rgb(15 23 42 / 12%);
    }
    .brand-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .brand-logo {
      width: 64px;
      height: 64px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .brand-text { text-align: center; }
    .brand-name {
      margin: 0;
      font-family: "Aptos Narrow", "Aptos", "Segoe UI", system-ui, -apple-system, sans-serif;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: #111111;
    }
    .brand-tagline {
      margin: 2px 0 0;
      font-size: 12px;
      font-style: italic;
      color: #374151;
    }
    .brand-sub {
      margin: 4px 0 0;
      font-size: 11px;
      color: #4b5563;
    }
    .report-title {
      margin: 16px 0 0;
      text-align: center;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #111111;
    }
    .printed {
      margin: 16px 0 0;
      font-size: 12px;
      font-style: italic;
      color: #4b5563;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px 24px;
      margin-top: 16px;
    }
    .meta-item dt {
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #6b7280;
    }
    .meta-item dd {
      margin: 4px 0 0;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.35;
      color: #111111;
      word-break: break-word;
    }
    .rule {
      margin-top: 20px;
      border-bottom: 1px solid #111111;
    }
    .section-title {
      margin: 24px 0 8px;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #6b7280;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      padding: 8px 12px 8px 0;
      text-align: left;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #6b7280;
      border-bottom: 1px solid #111111;
    }
    td {
      padding: 8px 12px 8px 0;
      vertical-align: top;
      border-bottom: 1px solid #e5e7eb;
    }
    .sign-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
    }
    .sign-label {
      margin: 0;
      font-size: 10px;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #6b7280;
    }
    .sign-line {
      margin-top: 40px;
      width: 192px;
      border-bottom: 1px solid #111111;
    }
    .sign-name {
      margin: 8px 0 0;
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .sign-role,
    .sign-date {
      margin: 2px 0 0;
      font-size: 12px;
      text-transform: uppercase;
      color: #4b5563;
    }
    .sign-date { text-transform: none; }
    .doc-footer {
      margin-top: 48px;
      padding-top: 8px;
      border-top: 1px solid #d1d5db;
      font-size: 11px;
      color: #6b7280;
    }
    ${reportPrintPageCss(formatAppFooterLabel())}
    @media print {
      body { background: white !important; }
      .toolbar { display: none !important; }
      .sheet-wrap { padding: 0; }
      .formal-report {
        width: 100% !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
      }
      .sign-grid, .brand-row, img { break-inside: avoid; page-break-inside: avoid; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Print / Save as PDF</button>
    <span>Use your browser print dialog to save as PDF.</span>
  </div>
  <div class="sheet-wrap">
    <article class="formal-report">
      <header>
        <div class="brand-row">
          <img class="brand-logo" src="${logoSrc}" alt="Burnout Detection System" />
          <div class="brand-text">
            <p class="brand-name">Burnout Detection System</p>
            <p class="brand-tagline">Student wellness &amp; early intervention</p>
            <p class="brand-sub">Guidance · Student Burnout Monitoring</p>
          </div>
          <img class="brand-logo" src="${logoSrc}" alt="" />
        </div>
        <p class="report-title">${escapeHtml(title)}</p>
        <p class="printed">Printed: ${escapeHtml(printedLabel)}</p>
        <dl class="meta-grid">${metaHtml}</dl>
        <div class="rule"></div>
      </header>

      <section>
        <h3 class="section-title">Report Data</h3>
        ${bodyHtml}
      </section>

      <section class="sign-grid">
        <div>
          <p class="sign-label">Prepared by</p>
          <div class="sign-line"></div>
          <p class="sign-name">${escapeHtml(preparedBy)}</p>
          <p class="sign-role">${escapeHtml(preparedRole)}</p>
          <p class="sign-date">Date: ${escapeHtml(preparedDate)}</p>
        </div>
        <div>
          <p class="sign-label">Noted by</p>
          <div class="sign-line"></div>
          <p class="sign-name">${escapeHtml(notedBy)}</p>
          <p class="sign-role">${escapeHtml(notedByRole)}</p>
          <p class="sign-date">Date: __________</p>
        </div>
      </section>

      <footer class="doc-footer">
        ${formatAppFooterLabel()}
      </footer>
    </article>
  </div>
</body>
</html>`);
  popup.document.close();
}
