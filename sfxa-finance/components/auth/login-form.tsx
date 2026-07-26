"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { login, type AuthActionState } from "@/app/actions/auth";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

const initialState: AuthActionState = {};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, formAction, pending] = useActionState(login, initialState);
  useActionToast(state);

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
        "Account created successfully. Sign in with your email and password."
      );
    }
  }, [queryError, resetSuccess, registered]);

  useEffect(() => {
    if (state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state.redirectTo, router]);

  return (
    <Card className="w-full max-w-md border-border/80 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Sign in</CardTitle>
        <CardDescription>
          Access the SFXA parish finance system with your staff account.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@parish.org"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending} size="lg">
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "w-full"
            )}
          >
            Register
          </Link>
          <p className="text-center text-xs text-muted-foreground">
            New staff? Create an account and select your role.
          </p>
          <Link
            href="/"
            className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            View public transparency dashboard
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
