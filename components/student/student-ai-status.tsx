"use client";

import { useEffect, useState } from "react";

import { browserCanReachAi, wakeBurnoutAiInBrowser } from "@/lib/student/wake-ai-browser";
import { cn } from "@/lib/utils";

type AiStatus = "checking" | "online" | "offline";

const COPY: Record<AiStatus, string> = {
  checking: "Checking AI…",
  online: "AI online",
  offline: "AI offline",
};

export function StudentAiStatus({ wake = false }: { wake?: boolean }) {
  const [status, setStatus] = useState<AiStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const started = Date.now();

    wakeBurnoutAiInBrowser();
    void browserCanReachAi().then((online) => {
      if (!cancelled && online) setStatus("online");
    });

    async function check() {
      try {
        const response = await fetch("/api/ai/status", { cache: "no-store" });
        const data = (await response.json()) as { online?: boolean };
        if (cancelled) return;
        if (response.ok && data.online) {
          setStatus("online");
          return;
        }
      } catch {
        if (cancelled) return;
      }

      if (Date.now() - started >= 60_000) {
        setStatus((current) => (current === "online" ? current : "offline"));
        return;
      }

      setStatus((current) => (current === "online" ? current : "checking"));
      timer = window.setTimeout(check, 5000);
    }

    void check();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [wake]);

  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        status === "online"
          ? "text-emerald-700 dark:text-emerald-400"
          : status === "offline"
            ? "text-amber-800 dark:text-amber-400"
            : "text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "online"
            ? "bg-emerald-600"
            : status === "offline"
              ? "bg-amber-600"
              : "bg-muted-foreground"
        )}
        aria-hidden
      />
      {COPY[status]}
    </p>
  );
}
