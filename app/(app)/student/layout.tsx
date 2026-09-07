import { requireRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["Student"]);
  return children;
}
