import { PasswordForm } from "@/components/auth/password-form";

export const metadata = {
  title: "Reset Password",
};

export default function ResetPasswordPage() {
  return <PasswordForm mode="reset" />;
}
