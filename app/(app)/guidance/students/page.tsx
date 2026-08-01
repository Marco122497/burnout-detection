import { StudentsManager } from "@/components/guidance/students-manager";
import { requireRole } from "@/lib/auth/session";
import {
  getDepartments,
  getUserEmails,
  getUsersByRole,
} from "@/lib/guidance/queries";

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
      <div>
        <p className="text-sm font-medium text-primary">Guidance module</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Student Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create student accounts, update course details, and reset passwords.
        </p>
      </div>
      <StudentsManager students={students} departments={departments} />
    </div>
  );
}
