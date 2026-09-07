import { requireRole } from "@/lib/auth/session";

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["Instructor"]);
  return children;
}
