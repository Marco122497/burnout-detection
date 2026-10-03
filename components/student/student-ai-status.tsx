"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type AiStatus = "checking" | "online" | "offline";

const COPY: Record<AiStatus, string> = {
  checking: "Checking AI…",
  online: "AI online",
  offline: "AI offline",
};

export function StudentAiStatus() {
  const [status, setStatus] = useState<AiStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const started = Date.now();

    async function check() {
      try {
        const response = await fetch("/api/ai/status", { cache: "no-store" });
        const data = (await response.json()) as { online?: boolean };
        if (cancelled) return;
        if (data.online) {
          setStatus("online");
          return;
        }
      } catch {
        if (cancelled) return;
      }

      if (Date.now() - started >= 60_000) {
        setStatus("offline");
        return;
      }

      setStatus("checking");
      timer = window.setTimeout(check, 5000);
    }

    void check();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

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
