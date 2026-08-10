import { UserCogIcon } from "lucide-react";

import { InstructorsManager } from "@/components/guidance/instructors-manager";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import {
  getDepartments,
  getInstructors,
  getUserEmails,
} from "@/lib/guidance/queries";

export const metadata = {
  title: "Instructors",
};

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
      <PageHeading
        title="Instructor Management"
        description="Create instructor accounts, assign departments, and reset passwords."
        icon={UserCogIcon}
      />
      <InstructorsManager instructors={instructors} departments={departments} />
    </div>
  );
}
