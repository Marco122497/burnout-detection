"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthBackground } from "@/components/auth/auth-background";

const SPLASH_SEEN_KEY = "burnout-splash-seen";

export function markSplashSeen() {
  try {
    sessionStorage.setItem(SPLASH_SEEN_KEY, "1");
  } catch {
    // ignore storage errors
  }
}

export function hasSplashBeenSeen() {
  try {
    return sessionStorage.getItem(SPLASH_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function SplashScreen({
  durationMs = 2000,
  href,
  onDone,
}: {
  durationMs?: number;
  /** Navigate here when the splash finishes. */
  href?: string;
  /** Called instead of navigation when provided. */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const exitAt = Math.max(durationMs - 350, 0);
    const exitTimer = window.setTimeout(() => setExiting(true), exitAt);
    const doneTimer = window.setTimeout(() => {
      markSplashSeen();
      if (onDone) {
        onDone();
      } else if (href) {
        router.replace(href);
      }
    }, durationMs);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(doneTimer);
    };
  }, [durationMs, href, onDone, router]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden transition-opacity duration-300 ${
        exiting ? "opacity-0" : "opacity-100"
      }`}
    >
      <AuthBackground />

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

/** Shows splash once per browser tab session, then reveals auth content. */
export function AuthSplashGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  useEffect(() => {
    const seen = hasSplashBeenSeen();
    setShowSplash(!seen);
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="relative min-h-svh" aria-hidden>
        <AuthBackground />
      </div>
    );
  }

  if (showSplash) {
    return (
      <SplashScreen durationMs={2000} onDone={() => setShowSplash(false)} />
    );
  }

  return children;
}
