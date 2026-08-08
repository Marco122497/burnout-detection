import { BellIcon } from "lucide-react";

import { NotificationsList } from "@/components/student/notifications-list";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getStudentNotifications } from "@/lib/student/queries";

export default async function StudentNotificationsPage() {
  const { supabase, user } = await requireRole(["Student"]);
  const notifications = await getStudentNotifications(supabase, user.id, 40);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Notifications"
        description="Weekly monitoring reminders, submission confirmations, and counseling recommendations."
        icon={BellIcon}
      />
      <NotificationsList notifications={notifications} />
    </div>
  );
}
