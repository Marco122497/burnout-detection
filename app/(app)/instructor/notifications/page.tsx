import { BellIcon } from "lucide-react";

import { NotificationsList } from "@/components/student/notifications-list";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getStudentNotifications } from "@/lib/student/queries";

export const metadata = {
  title: "Notifications",
};

export default async function InstructorNotificationsPage() {
  const { supabase, user } = await requireRole(["Instructor"]);
  const notifications = await getStudentNotifications(supabase, user.id, 50);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Notifications"
        description="Alerts for students in your department: weekly monitoring results and high burnout risk."
        icon={BellIcon}
      />
      <NotificationsList
        notifications={notifications}
        title="Department student alerts"
        description="You only receive updates for students in your assigned department."
      />
    </div>
  );
}
