"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function SplashScreen({
  durationMs = 2000,
  href = "/login",
}: {
  durationMs?: number;
  href?: string;
}) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitAt = Math.max(durationMs - 350, 0);
    const exitTimer = window.setTimeout(() => setExiting(true), exitAt);
    const navTimer = window.setTimeout(() => {
      router.replace(href);
    }, durationMs);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(navTimer);
    };
  }, [durationMs, href, router]);

  return (
    <div
      className={`relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden transition-opacity duration-300 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.93_0.03_195),_transparent_55%),linear-gradient(to_bottom,_oklch(0.985_0.01_200),_oklch(0.95_0.02_220))] dark:bg-[radial-gradient(ellipse_at_top,_oklch(0.35_0.03_210),_transparent_55%),linear-gradient(to_bottom,_oklch(0.22_0.01_230),_oklch(0.18_0.015_230))]"
      />

      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="splash-logo-wrap mb-6">
          <img
            src="/logo.png"
            alt="Burnout Monitor"
            width={160}
            height={160}
            className="splash-logo size-32 object-contain sm:size-40"
          />
        </div>

        <p className="splash-title font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Burnout Monitor
        </p>
        <p className="splash-subtitle mt-2 text-sm text-muted-foreground">
          Student wellness & early intervention
        </p>

        <div
          aria-hidden
          className="mt-8 h-1 w-28 overflow-hidden rounded-full bg-foreground/10"
        >
          <div className="splash-bar-fill h-full w-2/5 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
