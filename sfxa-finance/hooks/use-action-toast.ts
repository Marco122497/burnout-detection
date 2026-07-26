"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type ActionMessageState = {
  error?: string;
  success?: string;
};

export function useActionToast(state: ActionMessageState) {
  const lastError = useRef<string | undefined>(undefined);
  const lastSuccess = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      lastError.current = state.error;
      toast.error(state.error);
    }

    if (state.success && state.success !== lastSuccess.current) {
      lastSuccess.current = state.success;
      toast.success(state.success);
    }
  }, [state.error, state.success]);
}
