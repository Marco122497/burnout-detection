import { MegaphoneIcon } from "lucide-react";

import { GuidanceAnnouncementsManager } from "@/components/guidance/guidance-announcements";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getDepartments } from "@/lib/guidance/queries";
import type { AnnouncementRow } from "@/lib/instructor/queries";

export default async function GuidanceAnnouncementsPage() {
  const { supabase, user } = await requireRole(["Guidance Counselor"]);

  const [{ data }, departments, { data: students }] = await Promise.all([
    supabase
      .from("announcements")
      .select(
        "announcement_id, title, content, created_by, department_id, course, year_level, section, is_active, publish_date, expiration_date, created_at, updated_at"
      )
      .eq("created_by", user.id)
      .order("created_at", { ascending: false }),
    getDepartments(supabase),
    supabase
      .from("profiles")
      .select("course, section")
      .eq("role", "Student")
      .eq("is_active", true),
  ]);

  const courseOptions = [
    ...new Set(
      (students ?? [])
        .map((s) => s.course)
        .filter((value): value is string => Boolean(value))
    ),
  ].sort((a, b) => a.localeCompare(b));

  const sectionOptions = [
    ...new Set(
      (students ?? [])
        .map((s) => s.section)
        .filter((value): value is string => Boolean(value))
    ),
  ].sort((a, b) => a.localeCompare(b));

  return (
    <div className="space-y-6">
      <PageHeading
        title="School announcements"
        description="Create announcements for the entire department or target by department, year level, or section."
        icon={MegaphoneIcon}
      />
      <GuidanceAnnouncementsManager
        announcements={(data ?? []) as AnnouncementRow[]}
        departments={departments}
        courseOptions={courseOptions}
        sectionOptions={sectionOptions}
      />
    </div>
  );
}
