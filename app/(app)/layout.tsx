import { AppShell } from "@/components/layout/app-shell";
import type { NavNotification } from "@/components/layout/nav-notifications";
import { StudentGenderDialog } from "@/components/student/student-gender-dialog";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, profile } = await requireUser();

  const { data: rows } = await supabase
    .from("notifications")
    .select(
      "notification_id, title, message, notification_type, is_read, created_at"
    )
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(40);

  const notifications: NavNotification[] = (rows ?? []).map((row) => ({
    id: row.notification_id,
    title: row.title,
    content: row.message,
    type: row.notification_type,
    date: row.created_at,
    isRead: Boolean(row.is_read),
  }));

  const needsGender =
    profile.role === "Student" &&
    profile.sex !== "Male" &&
    profile.sex !== "Female";

  return (
    <AppShell
      profile={profile}
      email={user.email ?? null}
      notifications={notifications}
    >
      {needsGender ? <StudentGenderDialog /> : null}
      {children}
    </AppShell>
  );
}
