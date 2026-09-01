"use client";

import { useEffect, useState } from "react";

import { APP_BUILD_TIME, APP_DEVELOPER, APP_VERSION } from "@/lib/app-meta";
import { cn } from "@/lib/utils";

function formatBuiltAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "recently";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";

  const hours = Math.floor(minutes / 60);
  if (hours < 1) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 1) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

export function DeveloperCredit({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Made by{" "}
      <span className="font-semibold text-primary">{APP_DEVELOPER}</span>
    </p>
  );
}

export function AppMetaFooter({ className }: { className?: string }) {
  const [builtAgo, setBuiltAgo] = useState(() => formatBuiltAgo(APP_BUILD_TIME));

  useEffect(() => {
    const update = () => setBuiltAgo(formatBuiltAgo(APP_BUILD_TIME));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={cn("text-[11px] leading-relaxed", className)}>
      <p>
        v{APP_VERSION} · built {builtAgo}
      </p>
      <DeveloperCredit />
    </div>
  );
}

export function SidebarAppFooter() {
  return (
    <AppMetaFooter className="px-2 py-1 text-sidebar-foreground/60" />
  );
}
