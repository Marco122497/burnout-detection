"use client";

import { useEffect } from "react";

import { wakeBurnoutAiInBrowser } from "@/lib/student/wake-ai-browser";

/** Fires when the landing page is on screen, so the AI wake is not only a server after() hook. */
export function LandingAiWake() {
  useEffect(() => {
    wakeBurnoutAiInBrowser();
  }, []);

  return null;
}
