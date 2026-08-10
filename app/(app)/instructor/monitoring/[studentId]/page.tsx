import { notFound } from "next/navigation";

import { StudentAssessmentHistoryView } from "@/components/instructor/student-assessment-history";
import { requireRole } from "@/lib/auth/session";
import {
  getDepartmentName,
  getStudentAssessmentHistory,
} from "@/lib/instructor/queries";
import { getMonitoringAnswers } from "@/lib/student/queries";

export const metadata = {
  title: "Student Assessment History",
};

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

  const [answers, departmentName] = await Promise.all([
    getMonitoringAnswers(
      supabase,
      history.map((row) => row.monitoring_id)
    ),
    getDepartmentName(supabase, profile.department_id),
  ]);

  return (
    <StudentAssessmentHistoryView
      student={{ ...student, department_name: departmentName }}
      history={history}
      answers={answers}
    />
  );
}
