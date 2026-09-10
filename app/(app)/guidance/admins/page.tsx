
import { AdminsManager } from "@/components/guidance/admins-manager";
import { PageHeading } from "@/components/layout/page-heading";
import { requireRole } from "@/lib/auth/session";
import { getUserEmails, getUsersByRole } from "@/lib/guidance/queries";

export const metadata = {
  title: "Admins",
};

export default async function GuidanceAdminsPage() {
  const { supabase, user } = await requireRole(["Guidance Counselor"]);
  const [adminRows, emails] = await Promise.all([
    getUsersByRole(supabase, "Guidance Counselor"),
    getUserEmails(),
  ]);
  const admins = adminRows.map((admin) => ({
    ...admin,
    email: emails[admin.id] ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeading
        title="Admins"
        description="Manage guidance counselor accounts with admin access to the system."
      />
      <AdminsManager admins={admins} currentUserId={user.id} />
    </div>
  );
}
