import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Login",
};

export const maxDuration = 60;

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-72 w-full max-w-md animate-pulse rounded-xl bg-muted/60" />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
