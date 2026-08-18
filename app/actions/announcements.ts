"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { toAuditLogRow } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { notifyStudentsOfAnnouncement } from "@/lib/student/announcements";

export type AnnouncementActionState = {
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

function parseOptionalText(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text || null;
}

function parseOptionalYear(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const year = Number(raw);
  if (Number.isNaN(year) || year < 1 || year > 6) return null;
  return year;
}

function revalidateStudentAnnouncementViews() {
  revalidatePath("/student");
  revalidatePath("/student/notifications");
  revalidatePath("/", "layout");
}

async function notifyPublishedAnnouncement(input: {
  announcement_id: number;
  title: string;
  content: string;
  department_id: number | null;
  course: string | null;
  year_level: number | null;
  section: string | null;
  created_at?: string;
}) {
  await notifyStudentsOfAnnouncement({
    announcement_id: input.announcement_id,
    title: input.title,
    content: input.content,
    department_id: input.department_id,
    course: input.course,
    year_level: input.year_level,
    section: input.section,
    created_at: input.created_at ?? new Date().toISOString(),
  });
}

async function notifyPublishedAnnouncementById(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  announcementId: number
) {
  const { data } = await supabase
    .from("announcements")
    .select(
      "announcement_id, title, content, department_id, course, year_level, section, created_at"
    )
    .eq("announcement_id", announcementId)
    .maybeSingle();
  if (data) await notifyPublishedAnnouncement(data);
}

export async function createAnnouncement(
  _prev: AnnouncementActionState,
  formData: FormData
): Promise<AnnouncementActionState> {
  const { supabase, user, profile } = await requireRole(["Instructor"]);

  if (!profile.department_id) {
    return {
      error: "Assign a department to your instructor account before posting.",
    };
  }

  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const publish = String(formData.get("publish") || "") === "1";
  const course = parseOptionalText(formData.get("course"));
  const section = parseOptionalText(formData.get("section"));
  const year_level = parseOptionalYear(formData.get("year_level"));

  if (!title || !content) {
    return { error: "Title and content are required." };
  }

  if (String(formData.get("year_level") || "").trim() && year_level == null) {
    return { error: "Year level must be between 1 and 6." };
  }

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title,
      content,
      created_by: user.id,
      department_id: profile.department_id,
      course,
      year_level,
      section,
      is_active: publish,
      publish_date: new Date().toISOString(),
    })
    .select("announcement_id, created_at")
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: publish ? "PUBLISH_ANNOUNCEMENT" : "CREATE_ANNOUNCEMENT",
      action_type: "CREATE",
      table_name: "announcements",
      record_id: data.announcement_id,
      description: title,
      ip_address: await getIp(),
    })
  );

  if (publish) {
    await notifyPublishedAnnouncement({
      announcement_id: data.announcement_id,
      title,
      content,
      department_id: profile.department_id,
      course,
      year_level,
      section,
      created_at: data.created_at,
    });
  }

  revalidatePath("/instructor/announcements");
  revalidateStudentAnnouncementViews();
  return {
    success: publish
      ? "Announcement published."
      : "Announcement saved as draft.",
  };
}

export async function updateAnnouncement(
  _prev: AnnouncementActionState,
  formData: FormData
): Promise<AnnouncementActionState> {
  const { supabase, user, profile } = await requireRole(["Instructor"]);

  const announcementId = Number(formData.get("announcement_id"));
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const publish = String(formData.get("publish") || "") === "1";
  const course = parseOptionalText(formData.get("course"));
  const section = parseOptionalText(formData.get("section"));
  const year_level = parseOptionalYear(formData.get("year_level"));

  if (!announcementId || !title || !content) {
    return { error: "Title and content are required." };
  }

  if (String(formData.get("year_level") || "").trim() && year_level == null) {
    return { error: "Year level must be between 1 and 6." };
  }

  const { error } = await supabase
    .from("announcements")
    .update({
      title,
      content,
      course,
      year_level,
      section,
      department_id: profile.department_id,
      is_active: publish,
    })
    .eq("announcement_id", announcementId)
    .eq("created_by", user.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: publish ? "PUBLISH_ANNOUNCEMENT" : "UPDATE_ANNOUNCEMENT",
      action_type: "UPDATE",
      table_name: "announcements",
      record_id: announcementId,
      description: title,
      ip_address: await getIp(),
    })
  );

  if (publish) {
    await notifyPublishedAnnouncement({
      announcement_id: announcementId,
      title,
      content,
      department_id: profile.department_id,
      course,
      year_level,
      section,
    });
  }

  revalidatePath("/instructor/announcements");
  revalidateStudentAnnouncementViews();
  return { success: "Announcement updated." };
}

export async function deleteAnnouncement(
  _prev: AnnouncementActionState,
  formData: FormData
): Promise<AnnouncementActionState> {
  const { supabase, user, profile } = await requireRole(["Instructor"]);
  const announcementId = Number(formData.get("announcement_id"));

  if (!announcementId) {
    return { error: "Invalid announcement." };
  }

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("announcement_id", announcementId)
    .eq("created_by", user.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "DELETE_ANNOUNCEMENT",
      action_type: "DELETE",
      table_name: "announcements",
      record_id: announcementId,
      description: "Announcement deleted",
      ip_address: await getIp(),
    })
  );

  revalidatePath("/instructor/announcements");
  revalidateStudentAnnouncementViews();
  return { success: "Announcement deleted." };
}

export async function publishAnnouncement(
  _prev: AnnouncementActionState,
  formData: FormData
): Promise<AnnouncementActionState> {
  const { supabase, user, profile } = await requireRole(["Instructor"]);
  const announcementId = Number(formData.get("announcement_id"));

  if (!announcementId) {
    return { error: "Invalid announcement." };
  }

  const { error } = await supabase
    .from("announcements")
    .update({
      is_active: true,
      publish_date: new Date().toISOString(),
    })
    .eq("announcement_id", announcementId)
    .eq("created_by", user.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "PUBLISH_ANNOUNCEMENT",
      action_type: "UPDATE",
      table_name: "announcements",
      record_id: announcementId,
      description: "Announcement published",
      ip_address: await getIp(),
    })
  );

  await notifyPublishedAnnouncementById(supabase, announcementId);

  revalidatePath("/instructor/announcements");
  revalidateStudentAnnouncementViews();
  return { success: "Announcement published." };
}

function parseOptionalDepartmentId(value: FormDataEntryValue | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const id = Number(raw);
  if (Number.isNaN(id) || id < 1) return null;
  return id;
}

export async function createGuidanceAnnouncement(
  _prev: AnnouncementActionState,
  formData: FormData
): Promise<AnnouncementActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);

  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const publish = String(formData.get("publish") || "") === "1";
  const department_id = parseOptionalDepartmentId(
    formData.get("department_id")
  );
  const course = parseOptionalText(formData.get("course"));
  const section = parseOptionalText(formData.get("section"));
  const year_level = parseOptionalYear(formData.get("year_level"));

  if (!title || !content) {
    return { error: "Title and content are required." };
  }

  if (String(formData.get("year_level") || "").trim() && year_level == null) {
    return { error: "Year level must be between 1 and 6." };
  }

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      title,
      content,
      created_by: user.id,
      department_id,
      course,
      year_level,
      section,
      is_active: publish,
      publish_date: new Date().toISOString(),
    })
    .select("announcement_id, created_at")
    .single();

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: publish ? "PUBLISH_ANNOUNCEMENT" : "CREATE_ANNOUNCEMENT",
      action_type: "CREATE",
      table_name: "announcements",
      record_id: data.announcement_id,
      description: title,
      ip_address: await getIp(),
    })
  );

  if (publish) {
    await notifyPublishedAnnouncement({
      announcement_id: data.announcement_id,
      title,
      content,
      department_id,
      course,
      year_level,
      section,
      created_at: data.created_at,
    });
  }

  revalidatePath("/guidance/announcements");
  revalidateStudentAnnouncementViews();
  return {
    success: publish
      ? "Announcement published."
      : "Announcement saved as draft.",
  };
}

export async function updateGuidanceAnnouncement(
  _prev: AnnouncementActionState,
  formData: FormData
): Promise<AnnouncementActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);

  const announcementId = Number(formData.get("announcement_id"));
  const title = String(formData.get("title") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const publish = String(formData.get("publish") || "") === "1";
  const department_id = parseOptionalDepartmentId(
    formData.get("department_id")
  );
  const course = parseOptionalText(formData.get("course"));
  const section = parseOptionalText(formData.get("section"));
  const year_level = parseOptionalYear(formData.get("year_level"));

  if (!announcementId || !title || !content) {
    return { error: "Title and content are required." };
  }

  if (String(formData.get("year_level") || "").trim() && year_level == null) {
    return { error: "Year level must be between 1 and 6." };
  }

  const { error } = await supabase
    .from("announcements")
    .update({
      title,
      content,
      department_id,
      course,
      year_level,
      section,
      is_active: publish,
    })
    .eq("announcement_id", announcementId)
    .eq("created_by", user.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: publish ? "PUBLISH_ANNOUNCEMENT" : "UPDATE_ANNOUNCEMENT",
      action_type: "UPDATE",
      table_name: "announcements",
      record_id: announcementId,
      description: title,
      ip_address: await getIp(),
    })
  );

  if (publish) {
    await notifyPublishedAnnouncement({
      announcement_id: announcementId,
      title,
      content,
      department_id,
      course,
      year_level,
      section,
    });
  }

  revalidatePath("/guidance/announcements");
  revalidateStudentAnnouncementViews();
  return { success: "Announcement updated." };
}

export async function deleteGuidanceAnnouncement(
  _prev: AnnouncementActionState,
  formData: FormData
): Promise<AnnouncementActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);
  const announcementId = Number(formData.get("announcement_id"));

  if (!announcementId) {
    return { error: "Invalid announcement." };
  }

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("announcement_id", announcementId)
    .eq("created_by", user.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "DELETE_ANNOUNCEMENT",
      action_type: "DELETE",
      table_name: "announcements",
      record_id: announcementId,
      description: "Announcement deleted",
      ip_address: await getIp(),
    })
  );

  revalidatePath("/guidance/announcements");
  revalidateStudentAnnouncementViews();
  return { success: "Announcement deleted." };
}

export async function publishGuidanceAnnouncement(
  _prev: AnnouncementActionState,
  formData: FormData
): Promise<AnnouncementActionState> {
  const { supabase, user, profile } = await requireRole([
    "Guidance Counselor",
  ]);
  const announcementId = Number(formData.get("announcement_id"));

  if (!announcementId) {
    return { error: "Invalid announcement." };
  }

  const { error } = await supabase
    .from("announcements")
    .update({
      is_active: true,
      publish_date: new Date().toISOString(),
    })
    .eq("announcement_id", announcementId)
    .eq("created_by", user.id);

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_logs").insert(
    toAuditLogRow({
      user_id: user.id,
      user_role: profile.role,
      action: "PUBLISH_ANNOUNCEMENT",
      action_type: "UPDATE",
      table_name: "announcements",
      record_id: announcementId,
      description: "Announcement published",
      ip_address: await getIp(),
    })
  );

  await notifyPublishedAnnouncementById(supabase, announcementId);

  revalidatePath("/guidance/announcements");
  revalidateStudentAnnouncementViews();
  return { success: "Announcement published." };
}
