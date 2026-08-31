import { BellIcon } from "lucide-react";

import { NotificationsList } from "@/components/student/notifications-list";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getStudentNotifications } from "@/lib/student/queries";

export const metadata = {
  title: "Notifications",
};

export default async function GuidanceNotificationsPage() {
  const { supabase, user } = await requireRole(["Guidance Counselor"]);
  const notifications = await getStudentNotifications(supabase, user.id, 50);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Notifications"
        description="System alerts, high-risk student updates, and monitoring reminders for guidance staff."
        icon={BellIcon}
      />
      <NotificationsList
        notifications={notifications}
        title="Guidance notifications"
        description="Alerts sent to your guidance account across the college."
      />
    </div>
  );
}
