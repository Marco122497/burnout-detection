"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

type ActionMessageState = {
  error?: string;
  success?: string;
};

/**
 * Shows toast for action errors/success.
 * Pass `pending` from useActionState so the same message still toasts
 * on every new submit (pending true → false).
 */
export function useActionToast(state: ActionMessageState, pending?: boolean) {
  const lastError = useRef<string | undefined>(undefined);
  const lastSuccess = useRef<string | undefined>(undefined);
  const prevPending = useRef(false);

  useEffect(() => {
    if (pending === undefined) {
      if (state.error && state.error !== lastError.current) {
        lastError.current = state.error;
        toast.error(state.error);
      }

      if (state.success && state.success !== lastSuccess.current) {
        lastSuccess.current = state.success;
        toast.success(state.success);
      }
      return;
    }

    const finished = prevPending.current && !pending;
    prevPending.current = pending;
    if (!finished) return;

    if (state.error) {
      lastError.current = state.error;
      toast.error(state.error);
    }

    if (state.success) {
      lastSuccess.current = state.success;
      toast.success(state.success);
    }
  }, [pending, state.error, state.success]);
}
