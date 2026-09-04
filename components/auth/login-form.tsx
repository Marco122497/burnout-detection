"use client";

import { useActionState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { login, type AuthActionState } from "@/app/actions/auth";
import { useActionRedirect } from "@/hooks/use-action-redirect";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const initialState: AuthActionState = {};

export function LoginForm() {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(login, initialState);
  useActionToast(state);
  useActionRedirect(state);

  const redirecting = Boolean(state.redirectTo);
  const busy = pending || redirecting;

  const queryError = searchParams.get("error");
  const resetSuccess = searchParams.get("reset") === "success";
  const registered = searchParams.get("registered") === "1";

  useEffect(() => {
    if (queryError === "inactive") {
      toast.error("Your account is deactivated. Contact an administrator.");
    } else if (queryError === "noprofile") {
      toast.error(
        "Your account has no profile yet. Ask an administrator to set up your access."
      );
    } else if (queryError === "auth_callback") {
      toast.error(
        "Password reset link is invalid or expired. Please try again."
      );
    }

    if (resetSuccess) {
      toast.success("Password updated. You can sign in with your new password.");
    }

    if (registered) {
      toast.success(
        "Account created successfully. Sign in with your email or student ID."
      );
    }
  }, [queryError, resetSuccess, registered]);

  return (
    <>
      {busy ? (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/10"
          aria-hidden
        >
          <div className="login-top-progress h-full w-1/4 bg-primary" />
        </div>
      ) : null}

      <Card className="w-full max-w-md border-border/80 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Sign in</CardTitle>
          <CardDescription>
            Sign in with your school email or student ID number.
          </CardDescription>
        </CardHeader>
        <form action={formAction} aria-busy={busy}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or ID number</Label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                placeholder="enter your email or student ID"
                required
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <PasswordInput
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="enter your password"
                  required
                  disabled={busy}
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Forgot password? Contact the administrator.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={busy} size="lg">
              {redirecting ? (
                <>
                  <Loader2 className="animate-spin" />
                  Redirecting…
                </>
              ) : pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
