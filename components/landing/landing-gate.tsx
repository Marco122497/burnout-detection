"use client";

import { useState } from "react";

import { SplashScreen } from "@/components/auth/splash-screen";

export function LandingGate({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {children}
      {showSplash ? (
        <SplashScreen durationMs={2000} onDone={() => setShowSplash(false)} />
      ) : null}
    </>
  );
}
