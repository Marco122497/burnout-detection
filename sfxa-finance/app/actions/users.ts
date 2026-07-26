"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { ROLES, buildFullName, type UserRole } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export type UserActionState = {
  error?: string;
  success?: string;
};

async function getIp() {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    null
  );
}

async function writeAudit(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  action: string,
  description: string
) {
  await admin.from("audit_logs").insert({
    user_id: userId,
    action,
    table_name: "profiles",
    description,
    ip_address: await getIp(),
  });
}

export async function createUser(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  const { user: actor } = await requireAdmin();

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const first_name = String(formData.get("first_name") || "").trim();
  const middle_name = String(formData.get("middle_name") || "").trim() || null;
  const last_name = String(formData.get("last_name") || "").trim();
  const suffix = String(formData.get("suffix") || "").trim() || null;
  const employee_no = String(formData.get("employee_no") || "").trim() || null;
  const role = String(formData.get("role") || "").trim() as UserRole;
  const status = String(formData.get("status") || "1") === "1";

  if (!email || !password || !first_name || !last_name || !role) {
    return { error: "Please fill in all required fields." };
  }

  if (!ROLES.includes(role)) {
    return { error: "Please select a valid role." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const full_name = buildFullName({
    first_name,
    middle_name,
    last_name,
    suffix,
  });

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "User management requires SUPABASE_SERVICE_ROLE_KEY (legacy eyJ… key) in .env.local.",
    };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name,
      middle_name,
      last_name,
      suffix,
      employee_no,
      full_name,
      role,
    },
  });

  if (error) {
    const message = error.message || "Failed to create user.";
    if (/jwt|kid|es256|unverifiable|bad_jwt/i.test(message)) {
      return {
        error:
          "Invalid service role key. Use the Legacy service_role JWT (eyJ…) in .env.local.",
      };
    }
    if (/already|registered|exists/i.test(message)) {
      return { error: "An account with this email already exists." };
    }
    return { error: message };
  }

  if (!data.user) {
    return { error: "Failed to create user." };
  }

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!existing) {
    const { error: profileError } = await admin.from("profiles").insert({
      id: data.user.id,
      employee_no,
      first_name,
      middle_name,
      last_name,
      suffix,
      full_name,
      role,
      status,
    });
    if (profileError) {
      return { error: `Account created but profile failed: ${profileError.message}` };
    }
  } else {
    await admin
      .from("profiles")
      .update({
        employee_no,
        first_name,
        middle_name,
        last_name,
        suffix,
        full_name,
        role,
        status,
      })
      .eq("id", data.user.id);
  }

  await writeAudit(
    admin,
    actor.id,
    "CREATE_USER",
    `Created user ${email} as ${role}`
  );

  revalidatePath("/administrator/users");
  revalidatePath("/administrator");
  return { success: "User created successfully." };
}

export async function deleteUser(
  _prev: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  const { user: actor } = await requireAdmin();
  const userId = String(formData.get("user_id") || "").trim();

  if (!userId) {
    return { error: "Invalid user." };
  }

  if (userId === actor.id) {
    return { error: "You cannot delete your own account." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "User management requires SUPABASE_SERVICE_ROLE_KEY (legacy eyJ… key) in .env.local.",
    };
  }

  const { data: target } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (!target) {
    return { error: "User not found." };
  }

  // Clear nullable FKs so profile/auth delete is not blocked.
  await Promise.all([
    admin.from("login_history").update({ user_id: null }).eq("user_id", userId),
    admin.from("audit_logs").update({ user_id: null }).eq("user_id", userId),
    admin
      .from("announcements")
      .update({ created_by: null })
      .eq("created_by", userId),
    admin.from("donations").update({ created_by: null }).eq("created_by", userId),
    admin.from("expenses").update({ created_by: null }).eq("created_by", userId),
    admin.from("budgets").update({ created_by: null }).eq("created_by", userId),
    admin.from("backups").update({ created_by: null }).eq("created_by", userId),
    admin
      .from("budget_history")
      .update({ changed_by: null })
      .eq("changed_by", userId),
  ]);

  await writeAudit(
    admin,
    actor.id,
    "DELETE_USER",
    `Deleted user ${target.full_name} (${target.role})`
  );

  const { error } = await admin.auth.admin.deleteUser(userId);

  if (error) {
    const message = error.message || "Failed to delete user.";
    if (/jwt|kid|es256|unverifiable|bad_jwt/i.test(message)) {
      return {
        error:
          "Invalid service role key. Use the Legacy service_role JWT (eyJ…) in .env.local.",
      };
    }
    if (/foreign key|23503/i.test(message)) {
      return {
        error:
          "Cannot delete this user because related records still reference them.",
      };
    }
    return { error: message };
  }

  revalidatePath("/administrator/users");
  revalidatePath("/administrator");
  return { success: "User deleted." };
}
