import { notFound } from "next/navigation";

import { StudentAssessmentHistoryView } from "@/components/instructor/student-assessment-history";
import { requireRole } from "@/lib/auth/session";
import { getGuidanceStudentHistory } from "@/lib/guidance/monitoring";

export default async function GuidanceStudentHistoryPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const { supabase } = await requireRole(["Guidance Counselor"]);
  const { student, history } = await getGuidanceStudentHistory(
    supabase,
    studentId
  );

  if (!student) notFound();

  return (
    <StudentAssessmentHistoryView
      student={student}
      history={history}
      backHref="/guidance/monitoring"
    />
  );
}
