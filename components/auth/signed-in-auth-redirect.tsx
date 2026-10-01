"use client";

import { useEffect } from "react";

/**
 * Back/forward can restore the login screen from memory without asking the
 * server. Reload so an active session is sent to the dashboard instead.
 */
export function SignedInAuthRedirect() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return null;
}
