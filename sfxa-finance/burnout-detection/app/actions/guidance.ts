"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { toAuditLogRow } from "@/lib/audit";
import { getSessionUser, requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export type GuidanceActionState = {
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

export async function createDepartment(
  _prev: GuidanceActionState,
  formData: FormData
): Promise<GuidanceActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);

  const department_code = String(formData.get("department_code") || "")
    .trim()
    .toUpperCase();
  const department_name = String(formData.get("department_name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;

  if (!department_code || !department_name) {
    return { error: "Department code and name are required." };
  }

  const { data, error } = await supabase
    .from("departments")
    .insert({
      department_code,
      department_name,
      description,
      is_active: true,
    })
    .select("department_id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Department code or name already exists." };
    }
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "CREATE_DEPARTMENT",
      action_type: "CREATE",
      table_name: "departments",
      record_id: data.department_id,
      description: department_name,
      ip_address: await getIp(),
    })
  );

  revalidatePath("/guidance/departments");
  return { success: "Department created." };
}

export async function updateDepartment(
  _prev: GuidanceActionState,
  formData: FormData
): Promise<GuidanceActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);

  const department_id = Number(formData.get("department_id"));
  const department_code = String(formData.get("department_code") || "")
    .trim()
    .toUpperCase();
  const department_name = String(formData.get("department_name") || "").trim();
  const description = String(formData.get("description") || "").trim() || null;
  const is_active = String(formData.get("is_active") || "") === "1";

  if (!department_id || !department_code || !department_name) {
    return { error: "Department code and name are required." };
  }

  const { error } = await supabase
    .from("departments")
    .update({
      department_code,
      department_name,
      description,
      is_active,
    })
    .eq("department_id", department_id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Department code or name already exists." };
    }
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "UPDATE_DEPARTMENT",
      action_type: "UPDATE",
      table_name: "departments",
      record_id: department_id,
      description: `${department_name} (${is_active ? "active" : "inactive"})`,
      ip_address: await getIp(),
    })
  );

  revalidatePath("/guidance/departments");
  return { success: "Department updated." };
}

export async function toggleDepartmentStatus(
  _prev: GuidanceActionState,
  formData: FormData
): Promise<GuidanceActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);
  const department_id = Number(formData.get("department_id"));
  const is_active = String(formData.get("is_active") || "") === "1";

  if (!department_id) {
    return { error: "Invalid department." };
  }

  const { error } = await supabase
    .from("departments")
    .update({ is_active })
    .eq("department_id", department_id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: is_active ? "ACTIVATE_DEPARTMENT" : "DEACTIVATE_DEPARTMENT",
      action_type: "UPDATE",
      table_name: "departments",
      record_id: department_id,
      description: is_active ? "Department activated" : "Department deactivated",
      ip_address: await getIp(),
    })
  );

  revalidatePath("/guidance/departments");
  return {
    success: is_active ? "Department activated." : "Department deactivated.",
  };
}

export async function deleteDepartment(
  _prev: GuidanceActionState,
  formData: FormData
): Promise<GuidanceActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);
  const department_id = Number(formData.get("department_id"));

  if (!department_id) {
    return { error: "Invalid department." };
  }

  const { data: existing } = await supabase
    .from("departments")
    .select("department_id, department_name")
    .eq("department_id", department_id)
    .maybeSingle();

  if (!existing) {
    return { error: "Department not found." };
  }

  const { count: memberCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("department_id", department_id);

  if ((memberCount ?? 0) > 0) {
    return {
      error:
        "This department still has students or instructors. Reassign them or deactivate the department instead.",
    };
  }

  const { error } = await supabase
    .from("departments")
    .delete()
    .eq("department_id", department_id);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "This department is still referenced by other records. Deactivate it instead.",
      };
    }
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "DELETE_DEPARTMENT",
      action_type: "DELETE",
      table_name: "departments",
      record_id: department_id,
      description: existing.department_name,
      ip_address: await getIp(),
    })
  );

  revalidatePath("/guidance/departments");
  return { success: "Department deleted." };
}

export async function createInstructor(
  _prev: GuidanceActionState,
  formData: FormData
): Promise<GuidanceActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);

  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const first_name = String(formData.get("first_name") || "").trim();
  const middle_name = String(formData.get("middle_name") || "").trim() || null;
  const last_name = String(formData.get("last_name") || "").trim();
  const suffix = String(formData.get("suffix") || "").trim() || null;
  const employee_no = String(formData.get("employee_no") || "").trim() || null;
  const designation = String(formData.get("designation") || "").trim() || null;
  const department_id = Number(formData.get("department_id"));

  if (!email || !password || !first_name || !last_name || !department_id) {
    return {
      error: "Email, password, name, and department are required.",
    };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local to create instructors.",
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
      designation,
      department_id,
      role: "Instructor",
    },
  });

  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      return { error: "An account with this email already exists." };
    }
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Failed to create instructor account." };
  }

  await admin
    .from("profiles")
    .update({
      employee_no,
      designation,
      department_id,
      role: "Instructor",
      is_active: true,
    })
    .eq("id", data.user.id);

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "CREATE_INSTRUCTOR",
      action_type: "CREATE",
      table_name: "profiles",
      record_id: data.user.id,
      description: `Created instructor ${first_name} ${last_name}`,
      ip_address: await getIp(),
    })
  );

  revalidatePath("/guidance/instructors");
  revalidatePath("/guidance/departments");
  return { success: "Instructor account created." };
}

export async function updateInstructor(
  _prev: GuidanceActionState,
  formData: FormData
): Promise<GuidanceActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);

  const instructor_id = String(formData.get("instructor_id") || "").trim();
  const first_name = String(formData.get("first_name") || "").trim();
  const middle_name = String(formData.get("middle_name") || "").trim() || null;
  const last_name = String(formData.get("last_name") || "").trim();
  const suffix = String(formData.get("suffix") || "").trim() || null;
  const employee_no = String(formData.get("employee_no") || "").trim() || null;
  const designation = String(formData.get("designation") || "").trim() || null;
  const contact_number =
    String(formData.get("contact_number") || "").trim() || null;
  const department_id = Number(formData.get("department_id"));
  const is_active = String(formData.get("is_active") || "") === "1";

  if (!instructor_id || !first_name || !last_name || !department_id) {
    return { error: "Name and department are required." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name,
      middle_name,
      last_name,
      suffix,
      employee_no,
      designation,
      contact_number,
      department_id,
      is_active,
    })
    .eq("id", instructor_id)
    .eq("role", "Instructor");

  if (error) {
    if (error.code === "23505") {
      return { error: "Employee number is already in use." };
    }
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "UPDATE_INSTRUCTOR",
      action_type: "UPDATE",
      table_name: "profiles",
      record_id: instructor_id,
      description: `Updated instructor ${first_name} ${last_name}`,
      ip_address: await getIp(),
    })
  );

  revalidatePath("/guidance/instructors");
  revalidatePath("/guidance/departments");
  return { success: "Instructor updated." };
}

export async function toggleInstructorStatus(
  _prev: GuidanceActionState,
  formData: FormData
): Promise<GuidanceActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);
  const instructor_id = String(formData.get("instructor_id") || "").trim();
  const is_active = String(formData.get("is_active") || "") === "1";

  if (!instructor_id) {
    return { error: "Invalid instructor." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active })
    .eq("id", instructor_id)
    .eq("role", "Instructor");

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: is_active ? "ACTIVATE_INSTRUCTOR" : "DEACTIVATE_INSTRUCTOR",
      action_type: "UPDATE",
      table_name: "profiles",
      record_id: instructor_id,
      description: is_active ? "Instructor activated" : "Instructor deactivated",
      ip_address: await getIp(),
    })
  );

  revalidatePath("/guidance/instructors");
  return {
    success: is_active ? "Instructor activated." : "Instructor deactivated.",
  };
}

export async function resetInstructorPassword(
  _prev: GuidanceActionState,
  formData: FormData
): Promise<GuidanceActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);
  const instructor_id = String(formData.get("instructor_id") || "").trim();
  const new_password = String(formData.get("new_password") || "");

  if (!instructor_id || new_password.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error:
        "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to .env.local to reset passwords.",
    };
  }

  const { error } = await admin.auth.admin.updateUserById(instructor_id, {
    password: new_password,
  });

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "RESET_INSTRUCTOR_PASSWORD",
      action_type: "UPDATE",
      table_name: "auth.users",
      record_id: instructor_id,
      description: `Password reset for instructor ${instructor_id}`,
      ip_address: await getIp(),
    })
  );

  revalidatePath("/guidance/instructors");
  return { success: "Instructor password reset." };
}

export async function assignInstructorDepartment(
  _prev: GuidanceActionState,
  formData: FormData
): Promise<GuidanceActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);
  const instructor_id = String(formData.get("instructor_id") || "").trim();
  const department_id = Number(formData.get("department_id"));

  if (!instructor_id || !department_id) {
    return { error: "Instructor and department are required." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ department_id })
    .eq("id", instructor_id)
    .eq("role", "Instructor");

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "ASSIGN_INSTRUCTOR_DEPARTMENT",
      action_type: "UPDATE",
      table_name: "profiles",
      record_id: instructor_id,
      description: `Assigned instructor to department ${department_id}`,
      ip_address: await getIp(),
    })
  );

  revalidatePath("/guidance/instructors");
  revalidatePath("/guidance/departments");
  return { success: "Instructor assigned to department." };
}

export async function openNextMonitoringWeek(
  _prev: GuidanceActionState,
  _formData: FormData
): Promise<GuidanceActionState> {
  try {
    const session = await getSessionUser();
    if (
      !session.user ||
      !session.profile ||
      session.profile.role !== "Guidance Counselor"
    ) {
      return { error: "Please sign in again as a Guidance Counselor." };
    }

    const { supabase, user, profile } = session;

    const { data: term, error: termError } = await supabase
      .from("academic_terms")
      .select(
        "term_id, academic_year, semester, monitoring_week, monitoring_enabled"
      )
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (termError) {
      if (
        termError.message?.includes("monitoring_week") ||
        termError.message?.includes("monitoring_enabled")
      ) {
        return {
          error:
            "Run supabase/phase5-monitoring-week.sql in Supabase before opening weekly monitoring.",
        };
      }
      return { error: termError.message };
    }

    if (!term) {
      return { error: "No active academic term is configured." };
    }

    const currentWeek = Math.max(1, Number(term.monitoring_week) || 1);
    const nextWeek = currentWeek + 1;

    const { error } = await supabase
      .from("academic_terms")
      .update({
        monitoring_week: nextWeek,
        monitoring_enabled: true,
      })
      .eq("term_id", term.term_id);

    if (error) {
      if (
        error.message?.includes("monitoring_week") ||
        error.message?.includes("monitoring_enabled") ||
        error.code === "PGRST204"
      ) {
        return {
          error:
            "Run supabase/phase5-monitoring-week.sql in Supabase before opening weekly monitoring.",
        };
      }
      return { error: error.message };
    }

    try {
      const admin = createAdminClient();
      const { data: students } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "Student")
        .eq("is_active", true);

      if (students?.length) {
        // Insert in chunks to avoid oversized payloads.
        const chunkSize = 100;
        for (let i = 0; i < students.length; i += chunkSize) {
          const chunk = students.slice(i, i + chunkSize);
          await admin.from("notifications").insert(
            chunk.map((student) => ({
              user_id: student.id,
              title: `Weekly monitoring open · Week ${nextWeek}`,
              message: `Guidance has opened Week ${nextWeek} monitoring. Please complete your PSS, Academic Workload, Study Time, and Sleep Hours form.`,
              notification_type: "Reminder",
              priority: "High",
            }))
          );
        }
      }
    } catch {
      // Term update succeeded; notification fan-out is best-effort.
    }

    try {
      await supabase.from("audit_logs").insert(
        toAuditLogRow({
          user_id: user.id,
          user_role: profile.role,
          action: "OPEN_MONITORING_WEEK",
          action_type: "UPDATE",
          table_name: "academic_terms",
          record_id: term.term_id,
          description: `Opened monitoring Week ${nextWeek} for ${term.academic_year} ${term.semester}`,
          ip_address: await getIp(),
        })
      );
    } catch {
      // Audit is best-effort.
    }

    revalidatePath("/guidance/monitoring");
    revalidatePath("/guidance");
    revalidatePath("/student/monitoring");
    revalidatePath("/student");
    revalidatePath("/instructor/monitoring");

    return {
      success: `Week ${nextWeek} monitoring is now open for students.`,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to open the next monitoring week.",
    };
  }
}

export async function closeMonitoringWindow(
  _prev: GuidanceActionState,
  _formData: FormData
): Promise<GuidanceActionState> {
  try {
    const session = await getSessionUser();
    if (
      !session.user ||
      !session.profile ||
      session.profile.role !== "Guidance Counselor"
    ) {
      return { error: "Please sign in again as a Guidance Counselor." };
    }

    const { supabase, user, profile } = session;

    const { data: term, error: termError } = await supabase
      .from("academic_terms")
      .select("term_id, academic_year, semester, monitoring_week")
      .eq("is_active", true)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (termError) {
      if (termError.message?.includes("monitoring_week")) {
        return {
          error:
            "Run supabase/phase5-monitoring-week.sql in Supabase before managing weekly monitoring.",
        };
      }
      return { error: termError.message };
    }

    if (!term) {
      return { error: "No active academic term is configured." };
    }

    const week = Math.max(1, Number(term.monitoring_week) || 1);

    const { error } = await supabase
      .from("academic_terms")
      .update({ monitoring_enabled: false })
      .eq("term_id", term.term_id);

    if (error) {
      return { error: error.message };
    }

    try {
      await supabase.from("audit_logs").insert(
        toAuditLogRow({
          user_id: user.id,
          user_role: profile.role,
          action: "CLOSE_MONITORING_WEEK",
          action_type: "UPDATE",
          table_name: "academic_terms",
          record_id: term.term_id,
          description: `Closed monitoring Week ${week} for ${term.academic_year} ${term.semester}`,
          ip_address: await getIp(),
        })
      );
    } catch {
      // Audit is best-effort.
    }

    revalidatePath("/guidance/monitoring");
    revalidatePath("/guidance");
    revalidatePath("/student/monitoring");
    revalidatePath("/student");

    return { success: `Week ${week} monitoring window is now closed.` };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to close the monitoring window.",
    };
  }
}
