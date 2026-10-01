import { requireRole } from "@/lib/auth/session";
import { activateBurnoutAi } from "@/lib/student/activate-ai";

export const maxDuration = 60;

export default async function GuidanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["Guidance Counselor"]);
  activateBurnoutAi();
  return children;
}
