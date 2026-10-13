"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";

const selectClassName =
  "h-8 min-w-[180px] rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70";

export type ReportDepartmentOption = {
  id: string;
  label: string;
};

export function ReportFilters({
  type,
  week,
  maxWeek,
  basePath,
  types,
  departments = [],
  department = "all",
}: {
  type: string;
  week: number;
  maxWeek: number;
  basePath: string;
  types: readonly { id: string; label: string }[];
  departments?: readonly ReportDepartmentOption[];
  department?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState(type);
  const [selectedWeek, setSelectedWeek] = useState(String(week));
  const [selectedDepartment, setSelectedDepartment] = useState(department);

  useEffect(() => {
    setSelectedType(type);
    setSelectedWeek(String(week));
    setSelectedDepartment(department);
  }, [type, week, department]);

  const weekOptions = Array.from(
    { length: Math.max(1, maxWeek) },
    (_, index) => index + 1
  );

  function navigate(next: { type?: string; week?: string; department?: string }) {
    const params = new URLSearchParams({
      type: next.type ?? selectedType,
      week: next.week ?? selectedWeek,
    });
    const departmentValue = next.department ?? selectedDepartment;
    if (departmentValue && departmentValue !== "all") {
      params.set("department", departmentValue);
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
        <Label htmlFor="report-week" className="text-sm text-muted-foreground">
          Week
        </Label>
        <select
          id="report-week"
          value={isPending ? selectedWeek : String(week)}
          disabled={isPending}
          className={selectClassName}
          onChange={(event) => {
            const next = event.target.value;
            setSelectedWeek(next);
            navigate({ week: next });
          }}
        >
          {weekOptions.map((item) => (
            <option key={item} value={item}>
              Week {item}
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
            value={isPending ? selectedDepartment : department}
            disabled={isPending}
            className={`${selectClassName} min-w-[220px] max-w-[320px]`}
            onChange={(event) => {
              const next = event.target.value;
              setSelectedDepartment(next);
              navigate({ department: next });
            }}
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
