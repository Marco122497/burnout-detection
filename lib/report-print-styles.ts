function escapeCssString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const PRINT_MARGIN_FONT =
  '"Plus Jakarta Sans", system-ui, sans-serif';
const PRINT_NUMBER_FONT =
  '"SFMono-Regular", "SF Mono", Menlo, Monaco, Consolas, ui-monospace, monospace';

/** Fixed print margin footer (left) + page numbers (right) on every printed page. */
export function reportPrintPageCss(footerLabel: string) {
  const label = escapeCssString(footerLabel);

  return `
@media print {
  @page {
    size: A4;
    margin: 14mm 16mm 22mm;

    @bottom-left {
      content: "${label}";
      font-family: ${PRINT_MARGIN_FONT};
      font-size: 9px;
      color: #6b7280;
      vertical-align: top;
    }

    @bottom-right {
      content: "Page " counter(page) " of " counter(pages);
      font-family: ${PRINT_NUMBER_FONT};
      font-size: 9px;
      color: #6b7280;
      vertical-align: top;
    }
  }

  .report-doc-footer,
  .doc-footer {
    display: none !important;
  }
}
`.trim();
}
