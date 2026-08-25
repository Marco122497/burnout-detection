"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  REPORT_RANGE_PRESETS,
  getReportRangePreset,
  matchReportRangePreset,
  type ReportRangePreset,
} from "@/lib/reports-range";

const selectClassName =
  "h-8 min-w-[180px] rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70";

const dateClassName =
  "h-8 w-[150px] rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70";

export function ReportFilters({
  type,
  from,
  to,
  basePath,
  types,
}: {
  type: string;
  from: string;
  to: string;
  basePath: string;
  types: readonly { id: string; label: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState(type);
  const [fromDate, setFromDate] = useState(from);
  const [toDate, setToDate] = useState(to);

  useEffect(() => {
    setSelectedType(type);
    setFromDate(from);
    setToDate(to);
  }, [type, from, to]);

  const activePreset = matchReportRangePreset(
    isPending ? fromDate : from,
    isPending ? toDate : to
  );

  function navigate(next: { type?: string; from?: string; to?: string }) {
    const params = new URLSearchParams({
      type: next.type ?? selectedType,
      from: next.from ?? fromDate,
      to: next.to ?? toDate,
    });
    startTransition(() => {
      router.push(`${basePath}?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 print:hidden">
      <div className="space-y-1.5">
        <Label htmlFor="report-type" className="text-sm text-muted-foreground">
          Report type
        </Label>
        <select
          id="report-type"
          value={isPending ? selectedType : type}
          disabled={isPending}
          className={selectClassName}
          onChange={(event) => {
            const next = event.target.value;
            setSelectedType(next);
            navigate({ type: next });
          }}
        >
          {types.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-range" className="text-sm text-muted-foreground">
          Quick range
        </Label>
        <select
          id="report-range"
          value={activePreset ?? "custom"}
          disabled={isPending}
          className={selectClassName}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "custom") return;
            const range = getReportRangePreset(next as ReportRangePreset);
            setFromDate(range.from);
            setToDate(range.to);
            navigate(range);
          }}
        >
          {REPORT_RANGE_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-from" className="text-sm text-muted-foreground">
          From
        </Label>
        <Input
          id="report-from"
          type="date"
          value={isPending ? fromDate : from}
          disabled={isPending}
          className={dateClassName}
          onChange={(event) => {
            const next = event.target.value;
            setFromDate(next);
            if (!next) return;
            const end = toDate < next ? next : toDate;
            if (toDate < next) setToDate(next);
            navigate({ from: next, to: end });
          }}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-to" className="text-sm text-muted-foreground">
          To
        </Label>
        <Input
          id="report-to"
          type="date"
          value={isPending ? toDate : to}
          disabled={isPending}
          className={dateClassName}
          onChange={(event) => {
            const next = event.target.value;
            setToDate(next);
            if (!next) return;
            const start = fromDate > next ? next : fromDate;
            if (fromDate > next) setFromDate(next);
            navigate({ from: start, to: next });
          }}
        />
      </div>

      {isPending && (
        <div className="flex h-8 items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Updating report…
        </div>
      )}
    </div>
  );
}
