import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  AnnouncementManager,
  type AnnouncementRow,
} from "@/components/administrator/announcement-manager";

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("announcements")
    .select(
      "announcement_id, title, content, is_published, published_at, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Announcement Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add, edit, publish, and delete parish announcements.
        </p>
      </div>
      <AnnouncementManager announcements={(data ?? []) as AnnouncementRow[]} />
    </div>
  );
}
