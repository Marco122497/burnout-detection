import { BellIcon } from "lucide-react";

import { NotificationsList } from "@/components/student/notifications-list";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import {
  getStudentAnnouncements,
  mergeAnnouncementNotifications,
} from "@/lib/student/announcements";
import { getStudentNotifications } from "@/lib/student/queries";

export const metadata = {
  title: "Notifications",
};

export default async function StudentNotificationsPage() {
  const { supabase, user, profile } = await requireRole(["Student"]);
  const [notifications, announcements] = await Promise.all([
    getStudentNotifications(supabase, user.id, 40),
    getStudentAnnouncements(supabase, profile, 20),
  ]);
  const items = mergeAnnouncementNotifications(notifications, announcements);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Notifications"
        description="Weekly monitoring reminders, school announcements, submission confirmations, and counseling recommendations."
        icon={BellIcon}
      />
      <NotificationsList
        notifications={items}
        description="Weekly reminders, announcements, submission confirmations, and counseling alerts."
      />
    </div>
  );
}
