import { PasswordForm } from "@/components/auth/password-form";

export default function ChangePasswordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Change password
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update the password used to sign in to Burnout Monitor.
        </p>
      </div>
      <PasswordForm mode="change" />
    </div>
  );
}
