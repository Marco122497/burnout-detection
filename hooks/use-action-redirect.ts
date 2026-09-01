"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function useActionRedirect(state: { redirectTo?: string }) {
  const router = useRouter();

  useEffect(() => {
    if (state.redirectTo) {
      router.replace(state.redirectTo);
    }
  }, [state.redirectTo, router]);
}
