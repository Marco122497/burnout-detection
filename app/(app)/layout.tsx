import { AppShell } from "@/components/layout/app-shell";
import type { NavNotification } from "@/components/layout/nav-notifications";
import { StudentGenderDialog } from "@/components/student/student-gender-dialog";
import { StudentResearchConsentGate } from "@/components/student/student-research-consent-gate";
import { requireUser } from "@/lib/auth/session";
import { needsResearchConsent } from "@/lib/student/research-consent";

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
      "notification_id, title, message, notification_type, priority, is_read, created_at"
    )
    .eq("user_id", user.id)
    .eq("is_read", false)
    .order("created_at", { ascending: false })
    .limit(40);

  const notifications: NavNotification[] = (rows ?? [])
    .slice()
    .sort((a, b) => {
      const aHigh = a.priority === "High" ? 0 : 1;
      const bHigh = b.priority === "High" ? 0 : 1;
      if (aHigh !== bHigh) return aHigh - bHigh;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    })
    .map((row) => ({
      id: row.notification_id,
      title: row.title,
      content: row.message,
      type: row.notification_type,
      date: row.created_at,
      isRead: Boolean(row.is_read),
    }));

  const isStudent = profile.role === "Student";
  const needsConsent =
    isStudent &&
    needsResearchConsent(
      profile.research_consent_status,
      profile.research_consent_version
    );
  const needsGender =
    isStudent &&
    !needsConsent &&
    profile.sex !== "Male" &&
    profile.sex !== "Female";

  return (
    <>
      <AppShell
        profile={profile}
        email={user.email ?? null}
        notifications={notifications}
      >
        {children}
      </AppShell>
      {/* Outside AppShell so nav pending skeleton cannot hide these dialogs */}
      {needsConsent ? (
        <StudentResearchConsentGate
          studentNumber={profile.student_number}
          declined={profile.research_consent_status === "Declined"}
        />
      ) : null}
      {needsGender ? <StudentGenderDialog /> : null}
    </>
  );
}
