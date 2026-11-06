"use client";

import { useState } from "react";
import { DownloadIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  RESEARCH_DATASETS,
  RESEARCH_WEEKS,
  type ResearchDatasetKey,
  type ResearchWeekFilter,
} from "@/lib/guidance/research-downloads";

export function ResearchDataDownloads() {
  const [week, setWeek] = useState<ResearchWeekFilter>("all");
  const [selected, setSelected] = useState<ResearchDatasetKey[]>(
    RESEARCH_DATASETS.map((item) => item.key)
  );
  const [pending, setPending] = useState<string | null>(null);

  function toggle(key: ResearchDatasetKey) {
    setSelected((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  }

  async function download(datasets: ResearchDatasetKey[], pendingKey: string) {
    if (pending || datasets.length === 0) return;
    setPending(pendingKey);
    try {
      const params = new URLSearchParams({
        datasets: datasets.join(","),
        week: String(week),
      });
      const response = await fetch(`/api/guidance/research-export?${params}`);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="([^"]+)"/)?.[1];
      link.href = url;
      link.download = filename || "research-data-export.zip";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download that file. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Monitoring period</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Monitoring period">
          {RESEARCH_WEEKS.map((item) => {
            const value: ResearchWeekFilter =
              item.value === "all" ? "all" : (Number(item.value) as 1 | 2 | 3);
            const active = week === value;
            return (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                aria-pressed={active}
                disabled={pending !== null}
                onClick={() => setWeek(value)}
              >
                {item.label}
              </Button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground">
          The week filter applies to the student monitoring files. Forecasting
          pairs keep the selected week as the input week. Model metrics stay
          the saved hold-out.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Available datasets</h2>
        <ul className="divide-y rounded-xl border">
          {RESEARCH_DATASETS.map((item) => {
            const checked = selected.includes(item.key);
            const busy = pending === item.key;
            return (
              <li key={item.key} className="flex items-start gap-3 px-4 py-3">
                <label className="flex min-w-0 flex-1 cursor-pointer gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-primary"
                    checked={checked}
                    disabled={pending !== null}
                    onChange={() => toggle(item.key)}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {item.detail}
                    </span>
                    <span className="mt-1 block font-mono text-xs text-muted-foreground">
                      {item.download === "zip"
                        ? "model_evaluation_results.csv and companion files"
                        : item.filename}
                    </span>
                  </span>
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={pending !== null}
                  onClick={() => download([item.key], item.key)}
                >
                  {busy ? <Loader2 className="animate-spin" /> : <DownloadIcon />}
                  {busy ? "Preparing…" : item.download === "zip" ? "ZIP" : "CSV"}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {selected.length} of {RESEARCH_DATASETS.length} datasets selected
        </p>
        <Button
          type="button"
          disabled={pending !== null || selected.length === 0}
          onClick={() => download(selected, "zip")}
        >
          {pending === "zip" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <DownloadIcon />
          )}
          {pending === "zip" ? "Preparing…" : "Download ZIP"}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        Research IDs such as S001 replace names, email addresses, and student
        numbers. A chosen week adds that week to the student file names.
        Functional testing and usability files include only records that were
        actually stored. This page does not create sample evaluation answers.
      </p>
    </div>
  );
}
