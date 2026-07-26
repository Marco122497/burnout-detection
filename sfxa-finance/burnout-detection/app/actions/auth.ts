"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  getDashboardPath,
  type RegisterableRole,
  type UserRole,
} from "@/lib/auth/roles";
import { toAuditLogRow } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: string;
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

  redirect("/login?registered=1");
}

export async function login(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message || "Invalid email or password." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

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

  redirect(getDashboardPath(profile.role));
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

  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success:
      "If an account exists for that email, a password reset link has been sent.",
  };
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

    if (profile?.role) {
      redirect(getDashboardPath(profile.role));
    }
  }

  redirect("/login?reset=success");
}
