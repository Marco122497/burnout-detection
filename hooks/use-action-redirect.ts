"use client";

import { useEffect } from "react";

/**
 * Prefer a full navigation after auth so Set-Cookie from the Server Action
 * is committed before the next document request. Soft router.replace can race
 * and land on a protected route without session cookies.
 */
export function useActionRedirect(state: { redirectTo?: string }) {
  useEffect(() => {
    if (state.redirectTo) {
      window.location.replace(state.redirectTo);
    }
  }, [state.redirectTo]);
}
