import { InstructorsManager } from "@/components/guidance/instructors-manager";
import { requireRole } from "@/lib/auth/session";
import {
  getDepartments,
  getInstructors,
  getUserEmails,
} from "@/lib/guidance/queries";

export default async function GuidanceInstructorsPage() {
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const [instructorRows, departments, emails] = await Promise.all([
    getInstructors(supabase),
    getDepartments(supabase),
    getUserEmails(),
  ]);
  const instructors = instructorRows.map((instructor) => ({
    ...instructor,
    email: emails[instructor.id] ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Guidance module</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Instructor Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create instructor accounts, assign departments, and reset passwords.
        </p>
      </div>
      <InstructorsManager
        instructors={instructors}
        departments={departments}
      />
    </div>
  );
}
