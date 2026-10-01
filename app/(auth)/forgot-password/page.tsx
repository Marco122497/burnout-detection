import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getForgotPasswordEnabled } from "@/lib/app-settings";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Forgot Password",
};

export default async function ForgotPasswordPage() {
  let enabled = true;
  try {
    enabled = await getForgotPasswordEnabled(createAdminClient());
  } catch {
    enabled = true;
  }

  if (!enabled) {
    return (
      <Card className="w-full max-w-md border-border/80 shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Forgot password</CardTitle>
          <CardDescription>
            Password reset is turned off. Contact the Guidance Office to reset
            your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <ForgotPasswordForm />;
}
