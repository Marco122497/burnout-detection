"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import {
  changePassword,
  resetPassword,
  type AuthActionState,
} from "@/app/actions/auth";
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
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

type PasswordFormProps = {
  mode: "change" | "reset";
};

export function PasswordForm({ mode }: PasswordFormProps) {
  const action = mode === "change" ? changePassword : resetPassword;
  const [state, formAction, pending] = useActionState(action, initialState);
  useActionToast(state);
  useActionRedirect(state);

  return (
    <Card className="w-full max-w-md border-border/80 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">
          {mode === "change" ? "Change password" : "Set new password"}
        </CardTitle>
        <CardDescription>
          {mode === "change"
            ? "Confirm your current password, then choose a new one."
            : "Choose a new password for your burnout monitoring account."}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          {mode === "change" && (
            <div className="space-y-2">
              <Label htmlFor="current_password">Current password</Label>
              <PasswordInput
                id="current_password"
                name="current_password"
                autoComplete="current-password"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="new_password">New password</Label>
            <PasswordInput
              id="new_password"
              name="new_password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirm new password</Label>
            <PasswordInput
              id="confirm_password"
              name="confirm_password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={pending} size="lg">
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : mode === "change" ? (
              "Update password"
            ) : (
              "Save new password"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
