import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";

type NotificationLike = {
  notification_id: number;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
  announcement_id?: number | null;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type AnnouncementAudience = {
  announcement_id: number;
  title: string;
  content: string;
  department_id: number | null;
  course: string | null;
  year_level: number | null;
  section: string | null;
  created_at: string;
  publish_date?: string | null;
  expiration_date?: string | null;
};

export type StudentAudience = {
  department_id: number | null;
  course: string | null;
  year_level: number | null;
  section: string | null;
};

export function announcementMatchesStudent(
  announcement: Pick<
    AnnouncementAudience,
    "department_id" | "course" | "year_level" | "section" | "expiration_date"
  >,
  student: StudentAudience
) {
  if (
    announcement.expiration_date &&
    new Date(announcement.expiration_date).getTime() <= Date.now()
  ) {
    return false;
  }
  if (
    announcement.department_id != null &&
    student.department_id != null &&
    announcement.department_id !== student.department_id
  ) {
    return false;
  }
  if (
    announcement.course &&
    student.course &&
    announcement.course !== student.course
  ) {
    return false;
  }
  if (
    announcement.year_level != null &&
    student.year_level != null &&
    announcement.year_level !== student.year_level
  ) {
    return false;
  }
  if (
    announcement.section &&
    student.section &&
    announcement.section !== student.section
  ) {
    return false;
  }
  return true;
}

export async function getStudentAnnouncements(
  supabase: SupabaseClient,
  student: StudentAudience,
  limit = 20
): Promise<AnnouncementAudience[]> {
  const { data } = await supabase
    .from("announcements")
    .select(
      "announcement_id, title, content, created_at, publish_date, expiration_date, department_id, course, year_level, section, is_active"
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(40);

  return (data ?? [])
    .filter((item) => announcementMatchesStudent(item, student))
    .slice(0, limit);
}

export function mergeAnnouncementNotifications(
  notifications: NotificationLike[],
  announcements: AnnouncementAudience[]
): NotificationLike[] {
  const already = new Set(
    notifications
      .map((item) => item.announcement_id)
      .filter((id): id is number => id != null)
  );

  const extras: NotificationLike[] = announcements
    .filter((item) => !already.has(item.announcement_id))
    .map((item) => ({
      notification_id: -item.announcement_id,
      title: item.title,
      message: item.content,
      notification_type: "Announcement",
      priority: "Normal",
      is_read: true,
      created_at: item.publish_date || item.created_at,
    }));

  return [...notifications, ...extras].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/** Fan-out a published announcement to matching students (bell + notifications). */
export async function notifyStudentsOfAnnouncement(
  announcement: AnnouncementAudience
) {
  try {
    const admin = createAdminClient();
    let query = admin
      .from("profiles")
      .select("id, department_id, course, year_level, section")
      .eq("role", "Student")
      .eq("is_active", true);

    if (announcement.department_id != null) {
      query = query.eq("department_id", announcement.department_id);
    }

    const { data: students, error } = await query;
    if (error || !students?.length) return;

    const recipients = students.filter((student) =>
      announcementMatchesStudent(announcement, student)
    );
    if (!recipients.length) return;

    const { data: existing } = await admin
      .from("notifications")
      .select("user_id")
      .eq("announcement_id", announcement.announcement_id);

    const already = new Set((existing ?? []).map((row) => row.user_id));
    const rows = recipients
      .filter((student) => !already.has(student.id))
      .map((student) => ({
        user_id: student.id,
        title: announcement.title,
        message: announcement.content,
        notification_type: "Announcement" as const,
        priority: "Normal" as const,
        announcement_id: announcement.announcement_id,
      }));

    if (rows.length) {
      await admin.from("notifications").insert(rows);
    }
  } catch (error) {
    console.error("notifyStudentsOfAnnouncement:", error);
  }
}
