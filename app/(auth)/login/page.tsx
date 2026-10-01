import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";
import { getForgotPasswordEnabled } from "@/lib/app-settings";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Login",
};

export const maxDuration = 60;

export default async function LoginPage() {
  let forgotPasswordEnabled = true;
  try {
    forgotPasswordEnabled = await getForgotPasswordEnabled(createAdminClient());
  } catch {
    forgotPasswordEnabled = true;
  }

  return (
    <Suspense
      fallback={
        <div className="h-72 w-full max-w-md animate-pulse rounded-xl bg-muted/60" />
      }
    >
      <LoginForm forgotPasswordEnabled={forgotPasswordEnabled} />
    </Suspense>
  );
}
