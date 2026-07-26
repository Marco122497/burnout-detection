import { notFound } from "next/navigation";

import { StudentAssessmentHistoryView } from "@/components/instructor/student-assessment-history";
import { requireRole } from "@/lib/auth/session";
import { getStudentAssessmentHistory } from "@/lib/instructor/queries";

export default async function InstructorStudentHistoryPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const { supabase, profile } = await requireRole(["Instructor"]);
  const { student, history } = await getStudentAssessmentHistory(
    supabase,
    studentId,
    profile.department_id
  );

  if (!student) notFound();

  return (
    <StudentAssessmentHistoryView student={student} history={history} />
  );
}
