import { notFound } from "next/navigation";

import { StudentAssessmentHistoryView } from "@/components/instructor/student-assessment-history";
import { requireRole } from "@/lib/auth/session";
import { getStudentAssessmentHistory } from "@/lib/instructor/queries";
import { getMonitoringAnswers } from "@/lib/student/queries";

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

  const answers = await getMonitoringAnswers(
    supabase,
    history.map((row) => row.monitoring_id)
  );

  return (
    <StudentAssessmentHistoryView
      student={student}
      history={history}
      answers={answers}
    />
  );
}
