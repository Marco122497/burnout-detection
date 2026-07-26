import { requireRole } from "@/lib/auth/session";

export default async function GuidanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["Guidance Counselor"]);
  return children;
}
