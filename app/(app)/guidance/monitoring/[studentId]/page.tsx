import { notFound } from "next/navigation";

import { StudentAssessmentHistoryView } from "@/components/instructor/student-assessment-history";
import { requireRole } from "@/lib/auth/session";
import { getGuidanceStudentHistory } from "@/lib/guidance/monitoring";
import { getMonitoringAnswers } from "@/lib/student/queries";

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

  const answers = await getMonitoringAnswers(
    supabase,
    history.map((row) => row.monitoring_id)
  );

  return (
    <StudentAssessmentHistoryView
      student={student}
      history={history}
      answers={answers}
      backHref="/guidance/monitoring"
    />
  );
}
