"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";

const selectClassName =
  "h-8 min-w-[180px] rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70";

export function ReportFilters({
  type,
  week,
  maxWeek,
  basePath,
  types,
}: {
  type: string;
  week: number;
  maxWeek: number;
  basePath: string;
  types: readonly { id: string; label: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState(type);
  const [selectedWeek, setSelectedWeek] = useState(String(week));

  useEffect(() => {
    setSelectedType(type);
    setSelectedWeek(String(week));
  }, [type, week]);

  const weekOptions = Array.from(
    { length: Math.max(1, maxWeek) },
    (_, index) => index + 1
  );

  function navigate(next: { type?: string; week?: string }) {
    const params = new URLSearchParams({
      type: next.type ?? selectedType,
      week: next.week ?? selectedWeek,
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

      {isPending && (
        <div className="flex h-8 items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Updating report…
        </div>
      )}
    </div>
  );
}
