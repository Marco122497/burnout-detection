import { notFound } from "next/navigation";

import { StudentAssessmentHistoryView } from "@/components/instructor/student-assessment-history";
import { requireRole } from "@/lib/auth/session";
import {
  getDepartmentName,
  getInstructorDepartmentIds,
  getStudentAssessmentHistory,
} from "@/lib/instructor/queries";
export const metadata = {
  title: "Student Assessment History",
};

export default async function InstructorStudentHistoryPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const { supabase, user, profile } = await requireRole(["Instructor"]);
  const departmentIds = await getInstructorDepartmentIds(
    supabase,
    user.id,
    profile.department_id
  );
  const { student, history } = await getStudentAssessmentHistory(
    supabase,
    studentId,
    departmentIds
  );

  if (!student) notFound();

  const departmentName = await getDepartmentName(supabase, departmentIds);

  return (
    <StudentAssessmentHistoryView
      student={{ ...student, department_name: departmentName }}
      history={history}
      showAnswers={false}
      embedded
    />
  );
}
