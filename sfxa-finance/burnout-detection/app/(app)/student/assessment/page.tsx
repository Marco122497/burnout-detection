import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";

/** PSS is now part of the consolidated weekly monitoring form. */
export default async function StudentAssessmentPage() {
  await requireRole(["Student"]);
  redirect("/student/monitoring");
}
