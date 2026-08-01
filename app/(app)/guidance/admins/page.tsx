import { AdminsManager } from "@/components/guidance/admins-manager";
import { requireRole } from "@/lib/auth/session";
import { getUsersByRole } from "@/lib/guidance/queries";

export default async function GuidanceAdminsPage() {
  const { supabase, user } = await requireRole(["Guidance Counselor"]);
  const admins = await getUsersByRole(supabase, "Guidance Counselor");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">Guidance module</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Admin Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage guidance counselor accounts with admin access to the system.
        </p>
      </div>
      <AdminsManager admins={admins} currentUserId={user.id} />
    </div>
  );
}
