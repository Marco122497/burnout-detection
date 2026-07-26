import { requireAdmin } from "@/lib/auth/session";

export default async function AdministratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return children;
}
