"use client";

import { useEffect } from "react";

/** Fires when the landing page is on screen, so the AI wake is not only a server after() hook. */
export function LandingAiWake() {
  useEffect(() => {
    void fetch("/api/ai/warm", {
      method: "GET",
      cache: "no-store",
      keepalive: true,
    }).catch(() => {});
  }, []);

  return null;
}
