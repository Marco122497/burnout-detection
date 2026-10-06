"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { Loader2, RefreshCwIcon } from "lucide-react";

import {
  forgotPassword,
  verifyPasswordResetOtp,
  type AuthActionState,
} from "@/app/actions/auth";
import { useActionRedirect } from "@/hooks/use-action-redirect";
import { useActionToast } from "@/hooks/use-action-toast";
import { TopProgressBar } from "@/components/layout/top-progress-bar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [sendState, sendAction, sendPending] = useActionState(
    forgotPassword,
    initialState
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyPasswordResetOtp,
    initialState
  );
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  useActionToast(sendState, sendPending);
  useActionToast(verifyState, verifyPending);
  useActionRedirect(verifyState);

  const verifying = verifyPending || Boolean(verifyState.redirectTo);

  useEffect(() => {
    if (sendState.otpEmail) {
      setSentEmail(sendState.otpEmail);
      setOtp("");
    }
  }, [sendState.otpEmail]);

  if (sentEmail) {
    return (
      <>
        <TopProgressBar show={verifying} />
        <form id="resend-otp" action={sendAction} className="hidden">
          <input type="hidden" name="email" value={sentEmail} />
        </form>
        <Card className="mx-auto w-full max-w-md">
          <CardHeader>
            <CardTitle>Verify your email</CardTitle>
            <CardDescription>
              Enter the 6-digit verification code we sent to{" "}
              <span className="font-medium text-foreground">{sentEmail}</span>.
            </CardDescription>
          </CardHeader>
          <form action={verifyAction} aria-busy={verifying}>
            <CardContent>
              <input type="hidden" name="email" value={sentEmail} />
              <input type="hidden" name="otp" value={otp} />
              <Field>
                <div className="flex items-center justify-between gap-2">
                  <FieldLabel htmlFor="otp-verification">
                    Verification code
                  </FieldLabel>
                  <Button
                    type="submit"
                    form="resend-otp"
                    variant="outline"
                    size="xs"
                    disabled={sendPending || verifyPending}
                  >
                    {sendPending ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RefreshCwIcon />
                    )}
                    Resend Code
                  </Button>
                </div>
                <InputOTP
                  id="otp-verification"
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS}
                  value={otp}
                  onChange={setOtp}
                  disabled={verifying}
                  required
                >
                  <InputOTPGroup className="*:data-[slot=input-otp-slot]:h-12 *:data-[slot=input-otp-slot]:w-10 *:data-[slot=input-otp-slot]:text-lg sm:*:data-[slot=input-otp-slot]:w-12 sm:*:data-[slot=input-otp-slot]:text-xl">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <FieldDescription>
                  <button
                    type="button"
                    className="underline-offset-4 hover:underline"
                    onClick={() => setSentEmail(null)}
                  >
                    Use a different email address.
                  </button>
                </FieldDescription>
              </Field>
            </CardContent>
            <CardFooter>
              <Field>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifying || otp.length !== 6}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  <Link
                    href="/login"
                    className="underline underline-offset-4 transition-colors hover:text-primary"
                  >
                    Back to sign in
                  </Link>
                </p>
              </Field>
            </CardFooter>
          </form>
        </Card>
      </>
    );
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Forgot password</CardTitle>
        <CardDescription>
          Enter your account email and we will send a verification code if it
          exists.
        </CardDescription>
      </CardHeader>
      <form action={sendAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@ckcm.edu.ph"
              required
              disabled={sendPending}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            disabled={sendPending}
            size="lg"
          >
            {sendPending ? (
              <>
                <Loader2 className="animate-spin" />
                Sending…
              </>
            ) : (
              "Send code"
            )}
          </Button>
          <Link
            href="/login"
            className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
