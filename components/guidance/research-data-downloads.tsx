"use client";

import { useState } from "react";
import { DownloadIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";
import { RESEARCH_DOWNLOADS } from "@/lib/guidance/research-downloads";
import { cn } from "@/lib/utils";

export function ResearchDataDownloads() {
  const [pending, setPending] = useState<string | null>(null);

  async function download(file: string, filename: string) {
    if (pending) return;
    setPending(file);
    try {
      const response = await fetch(
        `/api/guidance/research-export?file=${encodeURIComponent(file)}`
      );
      if (!response.ok) {
        throw new Error("Download failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not download that file. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <ul className="divide-y rounded-lg border">
      {RESEARCH_DOWNLOADS.map((item) => {
        const busy = pending === item.file;
        return (
          <li
            key={item.file}
            className="flex items-center justify-between gap-4 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.detail}</p>
            </div>
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => download(item.file, item.filename)}
              className={cn(
                buttonVariants({
                  variant: item.file === "all" ? "default" : "outline",
                  size: "sm",
                })
              )}
            >
              {busy ? <Loader2 className="animate-spin" /> : <DownloadIcon />}
              {busy ? "Preparing…" : "Download"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
