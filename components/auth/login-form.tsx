"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { login, type AuthActionState } from "@/app/actions/auth";
import { useAuthBusy } from "@/components/auth/auth-busy";
import { DEFAULT_INITIAL_PASSWORD } from "@/lib/auth/defaults";
import { useActionRedirect } from "@/hooks/use-action-redirect";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { TopProgressBar } from "@/components/layout/top-progress-bar";

const initialState: AuthActionState = {};

export function LoginForm({
  forgotPasswordEnabled = true,
}: {
  forgotPasswordEnabled?: boolean;
}) {
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(login, initialState);
  const authBusy = useAuthBusy();
  const setAuthBusy = authBusy?.setBusy;
  useActionToast(state, pending);
  useActionRedirect(state);

  const redirecting = Boolean(state.redirectTo);
  const busy = pending || redirecting;

  useEffect(() => {
    setAuthBusy?.(busy);
    return () => setAuthBusy?.(false);
  }, [busy, setAuthBusy]);

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
      <TopProgressBar show={busy} />

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
        </CardHeader>
        <form action={formAction} aria-busy={busy}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">ID Number or Institutional email</Label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                placeholder="ID Number | example@ckcm.edu.ph"
                required
                disabled={busy}
                className="h-10 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Use the institutional email your school assigned.
              </p>
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
                  className="h-10 rounded-xl"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The default password is {DEFAULT_INITIAL_PASSWORD}.
              </p>
              {forgotPasswordEnabled ? (
                <p className="text-center text-xs text-muted-foreground">
                  <Link
                    href="/forgot-password"
                    className="underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </p>
              ) : null}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full rounded-full font-bold"
              disabled={busy}
              size="lg"
            >
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
                "Login Now"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
