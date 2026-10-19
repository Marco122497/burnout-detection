"use client";

import { useEffect } from "react";

import { wakeBurnoutAiInBrowser } from "@/lib/student/wake-ai-browser";

/** Runs on localhost and burnacle.com as soon as the app shell is on screen. */
export function AiWakeOnLoad() {
  useEffect(() => {
    wakeBurnoutAiInBrowser();
  }, []);

  return null;
}
