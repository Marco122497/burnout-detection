import { reportPrintPageCss } from "@/lib/report-print-styles";

export function ReportPrintStyles({ footerLabel }: { footerLabel: string }) {
  return (
    <style
      dangerouslySetInnerHTML={{ __html: reportPrintPageCss(footerLabel) }}
    />
  );
}
