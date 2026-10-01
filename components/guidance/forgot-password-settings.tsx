"use client";

import { useActionState } from "react";
import { KeyRoundIcon, Loader2 } from "lucide-react";

import {
  updateForgotPasswordEnabled,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRoundIcon className="size-4" />
          Forgot password
        </CardTitle>
        <CardDescription>
          Turn the login-page password reset on or off. Only
          superadmin@school.edu can change this.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex items-center justify-between gap-4">
          <input
            type="hidden"
            name="forgot_password_enabled"
            value={enabled ? "false" : "true"}
          />
          <div className="space-y-1">
            <Label htmlFor="forgot-password-toggle">
              Allow password reset by email
            </Label>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "On. The login page shows Forgot password and emails a verification code."
                : "Off. The login page hides Forgot password."}
            </p>
          </div>
          <button
            id="forgot-password-toggle"
            type="submit"
            role="switch"
            aria-checked={enabled}
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
            <span className="sr-only">
              {enabled ? "Turn off forgot password" : "Turn on forgot password"}
            </span>
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
