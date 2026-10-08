
import { AdminsManager } from "@/components/guidance/admins-manager";
import { PageHeading } from "@/components/layout/page-heading";
import { isSuperadminEmail } from "@/lib/auth/protected-accounts";
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
  const viewerIsSuperadmin = isSuperadminEmail(user.email);
  const admins = adminRows
    .map((admin) => ({
      ...admin,
      email: emails[admin.id] ?? null,
    }))
    .filter(
      (admin) => viewerIsSuperadmin || !isSuperadminEmail(admin.email)
    );

  return (
    <div className="space-y-6">
      <PageHeading
        title="Admins"
        description="Manage guidance counselor accounts with admin access to the system."
      />
      <AdminsManager
        admins={admins}
        currentUserId={user.id}
        currentUserEmail={user.email ?? null}
      />
    </div>
  );
}
