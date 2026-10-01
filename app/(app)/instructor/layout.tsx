import { requireRole } from "@/lib/auth/session";
import { activateBurnoutAi } from "@/lib/student/activate-ai";

export const maxDuration = 60;

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["Instructor"]);
  activateBurnoutAi();
  return children;
}
