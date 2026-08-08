import { MegaphoneIcon } from "lucide-react";

import { AnnouncementsManager } from "@/components/instructor/announcements-manager";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import type { AnnouncementRow } from "@/lib/instructor/queries";
import {
  getDepartmentName,
  getInstructorStudentRows,
} from "@/lib/instructor/queries";

export default async function InstructorAnnouncementsPage() {
  const { supabase, user, profile } = await requireRole(["Instructor"]);

  const [{ data }, rows, departmentName] = await Promise.all([
    supabase
      .from("announcements")
      .select(
        "announcement_id, title, content, created_by, department_id, course, year_level, section, is_active, publish_date, expiration_date, created_at, updated_at"
      )
      .eq("created_by", user.id)
      .order("updated_at", { ascending: false }),
    getInstructorStudentRows(supabase, profile.department_id),
    getDepartmentName(supabase, profile.department_id),
  ]);

  const courseOptions = [
    ...new Set(rows.map((r) => r.course).filter(Boolean) as string[]),
  ].sort();
  const sectionOptions = [
    ...new Set(rows.map((r) => r.section).filter(Boolean) as string[]),
  ].sort();

  return (
    <div className="space-y-6">
      <PageHeading
        title="Announcements"
        description="Create, edit, and delete announcements for your assigned department, course, year level, or section."
        icon={MegaphoneIcon}
      />
      <AnnouncementsManager
        announcements={(data ?? []) as AnnouncementRow[]}
        departmentName={departmentName}
        courseOptions={courseOptions}
        sectionOptions={sectionOptions}
      />
    </div>
  );
}
