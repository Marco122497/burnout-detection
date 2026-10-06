"use server";

import { createHash, randomInt, timingSafeEqual } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { activateBurnoutAi } from "@/lib/student/activate-ai";

import {
  getDashboardPath,
  type RegisterableRole,
  type UserRole,
} from "@/lib/auth/roles";
import { toAuditLogRow } from "@/lib/audit";
import { getForgotPasswordEnabled } from "@/lib/app-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendPasswordResetEmail } from "@/lib/email/resend";

export type AuthActionState = {
  error?: string;
  success?: string;
  redirectTo?: string;
  /** Set after a reset code is requested so the form can show OTP entry. */
  otpEmail?: string;
};

async function getRequestMeta() {
  const headerStore = await headers();
  return {
    ip:
      headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headerStore.get("x-real-ip") ||
      null,
    device: headerStore.get("user-agent") || null,
  };
}

const RESET_CODE_DIGITS = 6;
const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_CODE_MAX_ATTEMPTS = 5;

type PasswordResetMeta = {
  code_hash: string;
  token_hash: string;
  expires_at: string;
  attempts: number;
};

function newResetCode() {
  return randomInt(0, 10 ** RESET_CODE_DIGITS)
    .toString()
    .padStart(RESET_CODE_DIGITS, "0");
}

function hashResetCode(email: string, code: string) {
  return createHash("sha256")
    .update(`${email.trim().toLowerCase()}:${code}`)
    .digest("hex");
}

function resetCodesMatch(storedHash: string, email: string, code: string) {
  const actual = Buffer.from(hashResetCode(email, code));
  const expected = Buffer.from(storedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function burnedPasswordReset(): PasswordResetMeta {
  return {
    code_hash: "",
    token_hash: "",
    expires_at: new Date(0).toISOString(),
    attempts: RESET_CODE_MAX_ATTEMPTS,
  };
}

function readPasswordReset(
  metadata: Record<string, unknown> | undefined
): PasswordResetMeta | null {
  const value = metadata?.password_reset;
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<PasswordResetMeta>;
  if (
    typeof row.code_hash !== "string" ||
    typeof row.token_hash !== "string" ||
    typeof row.expires_at !== "string"
  ) {
    return null;
  }
  return {
    code_hash: row.code_hash,
    token_hash: row.token_hash,
    expires_at: row.expires_at,
    attempts: typeof row.attempts === "number" ? row.attempts : 0,
  };
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
) {
  const target = email.trim().toLowerCase();
  const perPage = 1000;

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === target
    );
    if (match) return match;
    if (data.users.length < perPage) return null;
  }

  return null;
}

type ResolveLoginEmailResult =
  | { ok: true; email: string }
  | { ok: false; reason: "not_found_email" | "not_found_id" | "config" };

async function authEmailExists(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<boolean | null> {
  // generateLink does not send mail; recovery errors when the auth user is missing.
  const { error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (!error) return true;
  const message = (error.message || "").toLowerCase();
  const code = String(
    (error as { code?: string }).code || error.status || ""
  ).toLowerCase();
  if (
    message.includes("not found") ||
    message.includes("unable to find") ||
    message.includes("user not found") ||
    code.includes("not_found") ||
    error.status === 404
  ) {
    return false;
  }
  // Unknown admin error — caller can fall through to password sign-in.
  return null;
}

async function resolveLoginEmail(
  identifier: string
): Promise<ResolveLoginEmailResult> {
  const value = identifier.trim();
  if (!value) return { ok: false, reason: "not_found_email" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    // Without the service role key we can still try email/password login.
    if (value.includes("@")) return { ok: true, email: value };
    return { ok: false, reason: "config" };
  }

  if (value.includes("@")) {
    const exists = await authEmailExists(admin, value);
    if (exists === false) return { ok: false, reason: "not_found_email" };
    return { ok: true, email: value };
  }

  const { data: byStudentNumber } = await admin
    .from("profiles")
    .select("id")
    .eq("student_number", value)
    .maybeSingle();

  const profile =
    byStudentNumber ??
    (
      await admin
        .from("profiles")
        .select("id")
        .eq("employee_no", value)
        .maybeSingle()
    ).data;

  if (!profile) return { ok: false, reason: "not_found_id" };

  const { data, error } = await admin.auth.admin.getUserById(profile.id);
  if (error || !data.user?.email) return { ok: false, reason: "not_found_id" };
  return { ok: true, email: data.user.email };
}

export async function register(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");
  const first_name = String(formData.get("first_name") || "").trim();
  const middle_name = String(formData.get("middle_name") || "").trim() || null;
  const last_name = String(formData.get("last_name") || "").trim();
  const suffix = String(formData.get("suffix") || "").trim() || null;
  const student_number =
    String(formData.get("student_number") || "").trim() || null;
  const departmentRaw = String(formData.get("department_id") || "").trim();
  const yearLevelRaw = String(formData.get("year_level") || "").trim();
  const role: RegisterableRole = "Student";

  if (!email || !password || !first_name || !last_name || !student_number) {
    return { error: "Please fill in all required fields." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Password and confirmation do not match." };
  }

  const department_id = departmentRaw ? Number(departmentRaw) : NaN;
  const year_level = yearLevelRaw ? Number(yearLevelRaw) : NaN;

  if (!departmentRaw || Number.isNaN(department_id)) {
    return { error: "Please select a valid course." };
  }

  if (!yearLevelRaw || Number.isNaN(year_level) || year_level < 1 || year_level > 6) {
    return { error: "Year level must be between 1 and 6." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Registration is not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local.",
    };
  }

  const { data: department, error: departmentError } = await admin
    .from("departments")
    .select("department_id, department_name, description, is_active")
    .eq("department_id", department_id)
    .eq("is_active", true)
    .maybeSingle();

  if (departmentError || !department) {
    return { error: "Please select a valid course." };
  }

  const course =
    department.description?.trim() || department.department_name || null;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name,
      middle_name,
      last_name,
      suffix,
      student_number,
      department_id,
      course,
      year_level,
      role,
    },
  });

  if (error) {
    const message = error.message || "Registration failed.";
    if (/already|registered|exists/i.test(message)) {
      return { error: "An account with this email already exists." };
    }
    return { error: message };
  }

  if (!data.user) {
    return { error: "Registration failed. Please try again." };
  }

  // Ensure profile fields beyond the auth trigger defaults
  await admin
    .from("profiles")
    .update({
      student_number,
      department_id,
      course,
      year_level,
      is_active: true,
    })
    .eq("id", data.user.id);

  const meta = await getRequestMeta();
  await admin.from("audit_logs").insert(
    toAuditLogRow({
      user_id: data.user.id,
      user_role: "Student",
      action: "REGISTER",
      action_type: "CREATE",
      table_name: "profiles",
      record_id: data.user.id,
      description: "Student self-registration",
      ip_address: meta.ip,
    })
  );

  return { redirectTo: "/login?registered=1" };
}

export async function login(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    const identifier = String(formData.get("identifier") || "").trim();
    const password = String(formData.get("password") || "");

    if (!identifier || !password) {
      return { error: "Email or ID number and password are required." };
    }

    const resolved = await resolveLoginEmail(identifier);
    if (!resolved.ok) {
      if (resolved.reason === "not_found_email") {
        return { error: "No account found with this email." };
      }
      if (resolved.reason === "not_found_id") {
        return { error: "No account found with this ID number." };
      }
      return {
        error:
          "ID login is not available right now. Use your email, or ask an administrator to configure access.",
      };
    }

    const email = resolved.email;
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      const message = (error?.message || "").toLowerCase();
      if (
        message.includes("invalid login") ||
        message.includes("invalid credentials") ||
        message.includes("email not confirmed")
      ) {
        return { error: "Incorrect password. Please try again." };
      }
      return { error: "Sign in failed. Please check your details and try again." };
    }

    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "role, is_active, research_consent_status, research_consent_version"
      )
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError?.message?.includes("research_consent")) {
      const legacy = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.user.id)
        .maybeSingle();
      profile = legacy.data
        ? {
            ...legacy.data,
            research_consent_status: null,
            research_consent_version: null,
          }
        : null;
      profileError = legacy.error;
    }

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return {
        error:
          "Your account has no profile yet. Contact the Guidance Office for access.",
      };
    }

    if (!profile.is_active) {
      await supabase.auth.signOut();
      return {
        error: "Your account is deactivated. Contact the Guidance Office.",
      };
    }

    const meta = await getRequestMeta();
    const now = new Date().toISOString();

    try {
      await supabase
        .from("profiles")
        .update({ last_login: now })
        .eq("id", data.user.id);

      await supabase.from("login_history").insert({
        user_id: data.user.id,
        email,
        login_status: "Success",
        login_time: now,
        ip_address: meta.ip,
        user_agent: meta.device,
      });

      await supabase.from("audit_logs").insert(
        toAuditLogRow({
          user_id: data.user.id,
          user_role: profile.role as UserRole,
          action: "LOGIN",
          action_type: "LOGIN",
          table_name: "profiles",
          record_id: data.user.id,
          description: "User signed in",
          ip_address: meta.ip,
          user_agent: meta.device,
        })
      );
    } catch {
      // Login should succeed even if audit/history writes fail.
    }

    // Return redirectTo (don't call redirect()) so Set-Cookie from sign-in
    // is applied on the action response before the client navigates.
    revalidatePath("/", "layout");
    if (
      profile.role === "Student" ||
      profile.role === "Instructor" ||
      profile.role === "Guidance Counselor"
    ) {
      activateBurnoutAi();
    }
    return { redirectTo: getDashboardPath(profile.role as UserRole) };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Sign in failed. Please try again.",
    };
  }
}

export async function logout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const meta = await getRequestMeta();

    const { data: openLogin } = await supabase
      .from("login_history")
      .select("login_history_id")
      .eq("user_id", user.id)
      .is("logout_time", null)
      .order("login_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (openLogin?.login_history_id) {
      await supabase
        .from("login_history")
        .update({ logout_time: new Date().toISOString() })
        .eq("login_history_id", openLogin.login_history_id);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    await supabase.from("audit_logs").insert(
      toAuditLogRow({
        user_id: user.id,
        user_role: (profile?.role as UserRole | undefined) ?? null,
        action: "LOGOUT",
        action_type: "LOGOUT",
        table_name: "profiles",
        record_id: user.id,
        description: "User signed out",
        ip_address: meta.ip,
        user_agent: meta.device,
      })
    );
  }

  await supabase.auth.signOut();
}

export async function forgotPassword(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim();

  if (!email) {
    return { error: "Email is required." };
  }

  try {
    const enabled = await getForgotPasswordEnabled(createAdminClient());
    if (!enabled) {
      return {
        error:
          "Password reset is turned off. Contact the Guidance Office to reset your password.",
      };
    }
  } catch {
    // Missing service role still allows the existing reset flow.
  }

  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const sent: AuthActionState = {
    success: "A verification code has been sent to your email.",
    otpEmail: email,
  };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${origin}/reset-password`,
      },
    });

    const missingAccount =
      error?.status === 404 ||
      (error?.message ?? "").toLowerCase().includes("not found");

    const tokenHash = data?.properties?.hashed_token?.trim();
    const userId = data?.user?.id;

    if (missingAccount || !tokenHash || !userId) {
      if (error && !missingAccount) {
        return { error: error.message };
      }
      return { error: "No account was found for that email." };
    }

    const code = newResetCode();
    const { error: updateError } = await admin.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          ...(data.user.app_metadata ?? {}),
          password_reset: {
            code_hash: hashResetCode(email, code),
            token_hash: tokenHash,
            expires_at: new Date(Date.now() + RESET_CODE_TTL_MS).toISOString(),
            attempts: 0,
          } satisfies PasswordResetMeta,
        },
      }
    );

    if (updateError) {
      return { error: updateError.message };
    }

    await sendPasswordResetEmail({
      to: email,
      code,
    });
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not send the password reset email.",
    };
  }

  return sent;
}

export async function verifyPasswordResetOtp(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim();
  const otp = String(formData.get("otp") || "").replace(/\s/g, "");

  if (!email) {
    return { error: "Email is required." };
  }

  if (!/^\d{6}$/.test(otp)) {
    return { error: "Enter the 6-digit verification code." };
  }

  const admin = createAdminClient();
  const user = await findAuthUserByEmail(admin, email);
  const reset = readPasswordReset(
    user?.app_metadata as Record<string, unknown> | undefined
  );
  if (
    !user ||
    !reset ||
    Date.parse(reset.expires_at) <= Date.now() ||
    reset.attempts >= RESET_CODE_MAX_ATTEMPTS
  ) {
    if (user) {
      await admin.auth.admin.updateUserById(user.id, {
        app_metadata: { password_reset: burnedPasswordReset() },
      });
    }
    return { error: "That code is incorrect or has expired." };
  }

  if (!resetCodesMatch(reset.code_hash, email, otp)) {
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        password_reset: {
          ...reset,
          attempts: reset.attempts + 1,
        },
      },
    });
    return { error: "That code is incorrect or has expired." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: reset.token_hash,
    type: "recovery",
  });

  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { password_reset: burnedPasswordReset() },
  });

  if (error) {
    return { error: "That code is incorrect or has expired." };
  }

  return { redirectTo: "/reset-password" };
}

export async function changePassword(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const currentPassword = String(formData.get("current_password") || "");
  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!newPassword || !confirmPassword) {
    return { error: "Please fill in all password fields." };
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation do not match." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "You must be signed in to change your password." };
  }

  if (currentPassword) {
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (reauthError) {
      return { error: "Current password is incorrect." };
    }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: error.message };
  }

  const meta = await getRequestMeta();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: (profile?.role as UserRole | undefined) ?? null,
      action: "CHANGE_PASSWORD",
      action_type: "UPDATE",
      table_name: "auth.users",
      record_id: user.id,
      description: "User changed password",
      ip_address: meta.ip,
      user_agent: meta.device,
    })
  );

  revalidatePath("/profile");
  revalidatePath("/change-password");

  return { success: "Password updated successfully." };
}

export async function resetPassword(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const newPassword = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (!newPassword || !confirmPassword) {
    return { error: "Please fill in all password fields." };
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New password and confirmation do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const meta = await getRequestMeta();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    await supabase.from("audit_logs").insert(
      toAuditLogRow({
        user_id: user.id,
        user_role: (profile?.role as UserRole | undefined) ?? null,
        action: "RESET_PASSWORD",
        action_type: "UPDATE",
        table_name: "auth.users",
        record_id: user.id,
        description: "User reset password via email link",
        ip_address: meta.ip,
        user_agent: meta.device,
      })
    );
  }

  await supabase.auth.signOut();
  return { redirectTo: "/login?reset=success" };
}
