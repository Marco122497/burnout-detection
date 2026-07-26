import { NotificationsList } from "@/components/student/notifications-list";
import { requireRole } from "@/lib/auth/session";
import { getStudentNotifications } from "@/lib/student/queries";

export default async function StudentNotificationsPage() {
  const { supabase, user } = await requireRole(["Student"]);
  const notifications = await getStudentNotifications(supabase, user.id, 40);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Student module</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Weekly monitoring reminders, submission confirmations, and counseling
          recommendations.
        </p>
      </div>
      <NotificationsList notifications={notifications} />
    </div>
  );
}
