"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  REPORT_PERIODS,
  REPORT_YEAR_LEVELS,
  type ReportPeriodMode,
} from "@/lib/reports-range";
import { formatYearLevel } from "@/lib/utils";

const selectClassName =
  "h-8 min-w-[180px] rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70";

const inputClassName =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70";

export type ReportDepartmentOption = {
  id: string;
  label: string;
};

type FilterState = {
  type: string;
  period: ReportPeriodMode;
  week: string;
  month: string;
  from: string;
  to: string;
  department: string;
  year: string;
};

export function ReportFilters({
  type,
  period,
  week,
  month,
  from,
  to,
  maxWeek,
  basePath,
  types,
  departments = [],
  department = "all",
  yearLevel = "all",
}: {
  type: string;
  period: ReportPeriodMode;
  week: number;
  month: string;
  from: string;
  to: string;
  maxWeek: number;
  basePath: string;
  types: readonly { id: string; label: string }[];
  departments?: readonly ReportDepartmentOption[];
  department?: string;
  yearLevel?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<FilterState | null>(null);
  const state: FilterState =
    isPending && optimistic
      ? optimistic
      : {
          type,
          period,
          week: String(week),
          month,
          from,
          to,
          department,
          year: yearLevel,
        };

  const weekOptions = Array.from(
    { length: Math.max(1, maxWeek) },
    (_, index) => index + 1
  );

  function navigate(patch: Partial<FilterState>) {
    const next = { ...state, ...patch };
    setOptimistic(next);

    const params = new URLSearchParams({ type: next.type, period: next.period });
    if (next.period === "week") params.set("week", next.week);
    if (next.period === "month") params.set("month", next.month);
    if (next.period === "range") {
      params.set("from", next.from);
      params.set("to", next.to);
    }
    if (next.department && next.department !== "all") {
      params.set("department", next.department);
    }
    if (next.year && next.year !== "all") {
      params.set("year", next.year);
    }
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
          value={state.type}
          disabled={isPending}
          className={selectClassName}
          onChange={(event) => navigate({ type: event.target.value })}
        >
          {types.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="report-period" className="text-sm text-muted-foreground">
          Period
        </Label>
        <select
          id="report-period"
          value={state.period}
          disabled={isPending}
          className={`${selectClassName} min-w-[170px]`}
          onChange={(event) =>
            navigate({ period: event.target.value as ReportPeriodMode })
          }
        >
          {REPORT_PERIODS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {state.period === "week" && (
        <div className="space-y-1.5">
          <Label htmlFor="report-week" className="text-sm text-muted-foreground">
            Week
          </Label>
          <select
            id="report-week"
            value={state.week}
            disabled={isPending}
            className={`${selectClassName} min-w-[120px]`}
            onChange={(event) => navigate({ week: event.target.value })}
          >
            {weekOptions.map((item) => (
              <option key={item} value={item}>
                Week {item}
              </option>
            ))}
          </select>
        </div>
      )}

      {state.period === "month" && (
        <div className="space-y-1.5">
          <Label htmlFor="report-month" className="text-sm text-muted-foreground">
            Month
          </Label>
          <input
            id="report-month"
            type="month"
            value={state.month}
            disabled={isPending}
            className={inputClassName}
            onChange={(event) => {
              if (event.target.value) navigate({ month: event.target.value });
            }}
          />
        </div>
      )}

      {state.period === "range" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="report-from" className="text-sm text-muted-foreground">
              From
            </Label>
            <input
              id="report-from"
              type="date"
              value={state.from}
              max={state.to || undefined}
              disabled={isPending}
              className={inputClassName}
              onChange={(event) => {
                if (event.target.value) navigate({ from: event.target.value });
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-to" className="text-sm text-muted-foreground">
              To
            </Label>
            <input
              id="report-to"
              type="date"
              value={state.to}
              min={state.from || undefined}
              disabled={isPending}
              className={inputClassName}
              onChange={(event) => {
                if (event.target.value) navigate({ to: event.target.value });
              }}
            />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="report-year" className="text-sm text-muted-foreground">
          Year level
        </Label>
        <select
          id="report-year"
          value={state.year}
          disabled={isPending}
          className={`${selectClassName} min-w-[140px]`}
          onChange={(event) => navigate({ year: event.target.value })}
        >
          <option value="all">All year levels</option>
          {REPORT_YEAR_LEVELS.map((year) => (
            <option key={year} value={String(year)}>
              {formatYearLevel(year)}
            </option>
          ))}
        </select>
      </div>

      {departments.length > 0 && (
        <div className="space-y-1.5">
          <Label
            htmlFor="report-department"
            className="text-sm text-muted-foreground"
          >
            Department
          </Label>
          <select
            id="report-department"
            value={state.department}
            disabled={isPending}
            className={`${selectClassName} min-w-[220px] max-w-[320px]`}
            onChange={(event) => navigate({ department: event.target.value })}
          >
            <option value="all">All departments</option>
            {departments.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {isPending && (
        <div className="flex h-8 items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Updating report…
        </div>
      )}
    </div>
  );
}
