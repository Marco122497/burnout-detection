"use client";

import { Button } from "@/components/ui/button";

export function ReportExportButtons({
  filename,
  rows,
  title,
}: {
  filename: string;
  rows: string[][];
  title: string;
}) {
  function exportExcel() {
    const csv = rows
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "");
            if (value.includes(",") || value.includes('"') || value.includes("\n")) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filename}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const previousTitle = document.title;
    document.title = title;
    window.print();
    document.title = previousTitle;
  }

  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button type="button" variant="outline" onClick={exportExcel}>
        Export Excel (CSV)
      </Button>
      <Button type="button" onClick={exportPdf}>
        Export PDF / Print
      </Button>
    </div>
  );
}
