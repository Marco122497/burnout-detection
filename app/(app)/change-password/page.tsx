import { KeyRoundIcon } from "lucide-react";

import { PasswordForm } from "@/components/auth/password-form";
import { PageHeading } from "@/components/layout/page-heading";

export const metadata = {
  title: "Change Password",
};

export default function ChangePasswordPage() {
  return (
    <div className="space-y-6">
      <PageHeading
        title="Change password"
        description="Update the password used to sign in to Burnout Monitor."
        icon={KeyRoundIcon}
      />
      <PasswordForm mode="change" />
    </div>
  );
}
