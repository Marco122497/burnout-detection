import { UsersIcon } from "lucide-react";

import { StudentsManager } from "@/components/guidance/students-manager";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import {
  getDepartments,
  getUserEmails,
  getUsersByRole,
} from "@/lib/guidance/queries";

export const metadata = {
  title: "Students",
};

export default async function GuidanceStudentsPage() {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const [studentRows, departments, emails] = await Promise.all([
    getUsersByRole(supabase, "Student"),
    getDepartments(supabase),
    getUserEmails(),
  ]);
  const students = studentRows.map((student) => ({
    ...student,
    email: emails[student.id] ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeading
        title="Student Management"
        description="Create student accounts, update course details, and reset passwords."
        icon={UsersIcon}
      />
      <StudentsManager students={students} departments={departments} />
    </div>
  );
}
