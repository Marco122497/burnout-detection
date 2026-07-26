"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { BUDGET_TABS, resolveBudgetTab } from "@/lib/treasurer-budget";
import { Label } from "@/components/ui/label";

const selectClassName =
  "h-8 min-w-[210px] rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70";

export function BudgetNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(() => resolveBudgetTab(pathname));

  useEffect(() => {
    setSelected(resolveBudgetTab(pathname));
  }, [pathname]);

  useEffect(() => {
    for (const tab of BUDGET_TABS) {
      router.prefetch(tab.href);
    }
  }, [router]);

  const value = isPending ? selected : resolveBudgetTab(pathname);

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Label htmlFor="budget-section" className="text-sm text-muted-foreground">
        Section
      </Label>
      <select
        id="budget-section"
        value={value}
        disabled={isPending}
        className={selectClassName}
        onChange={(event) => {
          const next = event.target.value;
          if (next === pathname) return;
          setSelected(next as typeof value);
          startTransition(() => {
            router.push(next);
          });
        }}
      >
        {BUDGET_TABS.map((tab) => (
          <option key={tab.href} value={tab.href}>
            {tab.label}
          </option>
        ))}
      </select>
      {isPending && (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
