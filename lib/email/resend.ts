import { Resend } from "resend";

const DEFAULT_FROM = "Burnout Detection System <noreply@burnacle.com>";

function passwordResetEmail(code: string) {
  const safeCode = code.replace(/[^\d]/g, "");
  return [
    "Hello,",
    "",
    "We received a request to reset the password for your Burnout Detection System account.",
    "",
    "Your verification code is:",
    "",
    safeCode,
    "",
    "Enter this code on the forgot-password page. The code expires shortly and can be used only once. Please do not share it.",
    "",
    "If you did not request a password reset, you can ignore this email. Your password will not be changed.",
    "",
    "Burnout Detection System",
    "Detect Early. Act Wisely. Stay Strong.",
    "www.burnacle.com",
    "",
    "This is an automated message. Please do not reply.",
  ].join("\n");
}

function resendApiKey() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key || key.includes("xxxx") || key === "re_xxxxxxxxx") return null;
  return key;
}

export function resendFromAddress() {
  return process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
}

export async function sendPasswordResetEmail(input: {
  to: string;
  code: string;
}) {
  const apiKey = resendApiKey();
  if (!apiKey) {
    throw new Error(
      "Password reset email is not configured. Add RESEND_API_KEY to .env.local."
    );
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: resendFromAddress(),
    to: input.to,
    subject: "Your Burnout Detection System password reset code",
    text: passwordResetEmail(input.code),
  });

  if (error) {
    throw new Error(error.message);
  }
}
