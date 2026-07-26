"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { REPORT_PERIODS } from "@/lib/reports";
import { Label } from "@/components/ui/label";

const selectClassName =
  "h-8 min-w-[160px] rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70";

export function ReportPeriodSelect({
  period,
  basePath = "/administrator/reports",
}: {
  period: string;
  basePath?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(period);

  useEffect(() => {
    setSelected(period);
  }, [period]);

  useEffect(() => {
    for (const item of REPORT_PERIODS) {
      router.prefetch(`${basePath}?period=${item.id}`);
    }
  }, [basePath, router]);

  const value = isPending ? selected : period;

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Label htmlFor="report-period" className="text-sm text-muted-foreground">
        Period
      </Label>
      <select
        id="report-period"
        value={value}
        disabled={isPending}
        className={selectClassName}
        onChange={(event) => {
          const next = event.target.value;
          setSelected(next);
          startTransition(() => {
            router.push(`${basePath}?period=${next}`);
          });
        }}
      >
        {REPORT_PERIODS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      {isPending && (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
