import { requireAdmin } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/auth/roles";
import { AddUserDialog } from "@/components/administrator/add-user-dialog";
import { UsersTable } from "@/components/administrator/users-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function AdminUsersPage() {
  const { user } = await requireAdmin();

  let users: Profile[] = [];
  let loadError: string | null = null;

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      loadError = error.message;
    } else {
      users = (data ?? []) as Profile[];
    }
  } catch {
    loadError =
      "Add SUPABASE_SERVICE_ROLE_KEY (legacy eyJ… service_role JWT) to .env.local to manage users.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            User Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage user access and roles. Personal information is stored in
            profiles.
          </p>
        </div>
        <AddUserDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Search and filter update the table as you type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : (
            <UsersTable users={users} currentUserId={user.id} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
