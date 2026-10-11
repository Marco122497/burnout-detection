"use client";

import { useActionState } from "react";
import { KeyRoundIcon, Loader2 } from "lucide-react";

import {
  updateForgotPasswordEnabled,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { useActionToast } from "@/hooks/use-action-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: GuidanceActionState = {};

export function ForgotPasswordSettings({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(
    updateForgotPasswordEnabled,
    initialState
  );
  useActionToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRoundIcon className="size-4" />
          Forgot password
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex items-center justify-between gap-4">
          <input
            type="hidden"
            name="forgot_password_enabled"
            value={enabled ? "false" : "true"}
          />
          <Label htmlFor="forgot-password-toggle" className="font-normal">
            {enabled ? "Shown on the login page" : "Hidden on the login page"}
          </Label>
          <button
            id="forgot-password-toggle"
            type="submit"
            role="switch"
            aria-checked={enabled}
            aria-label={enabled ? "Turn off" : "Turn on"}
            disabled={pending}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              enabled ? "bg-primary" : "bg-input"
            )}
          >
            {pending ? (
              <Loader2 className="mx-auto size-3.5 animate-spin text-primary-foreground" />
            ) : (
              <span
                className={cn(
                  "pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform",
                  enabled ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            )}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
