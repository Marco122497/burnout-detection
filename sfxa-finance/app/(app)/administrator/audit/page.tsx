import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/auth/roles";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin();
  const { tab = "activity" } = await searchParams;
  const supabase = await createClient();

  const [{ data: loginHistory }, { data: auditLogs }, { data: transactions }] =
    await Promise.all([
      supabase
        .from("login_history")
        .select(
          "login_id, login_time, logout_time, ip_address, device_info, profiles(full_name, role)"
        )
        .order("login_time", { ascending: false })
        .limit(100),
      supabase
        .from("audit_logs")
        .select(
          "audit_id, action, table_name, description, ip_address, created_at, profiles(full_name)"
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("audit_logs")
        .select(
          "audit_id, action, table_name, description, created_at, profiles(full_name)"
        )
        .in("table_name", ["donations", "expenses", "budgets", "announcements"])
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

  function profileName(value: unknown) {
    if (Array.isArray(value)) return value[0]?.full_name || "—";
    if (value && typeof value === "object" && "full_name" in value) {
      return String((value as { full_name?: string }).full_name || "—");
    }
    return "—";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
          Audit Trail
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Login history, user activities, and transaction-related events.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <a
          href="/administrator/audit?tab=logins"
          className={tab === "logins" ? "font-semibold underline" : "underline-offset-4 hover:underline"}
        >
          Login History
        </a>
        <span className="text-muted-foreground">·</span>
        <a
          href="/administrator/audit?tab=activity"
          className={tab === "activity" ? "font-semibold underline" : "underline-offset-4 hover:underline"}
        >
          User Activities
        </a>
        <span className="text-muted-foreground">·</span>
        <a
          href="/administrator/audit?tab=transactions"
          className={
            tab === "transactions"
              ? "font-semibold underline"
              : "underline-offset-4 hover:underline"
          }
        >
          Transaction History
        </a>
      </div>

      {tab === "logins" ? (
        <Card>
          <CardHeader>
            <CardTitle>Login History</CardTitle>
            <CardDescription>Recent sign-in sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Login</TableHead>
                  <TableHead>Logout</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Device</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(loginHistory ?? []).map((row) => (
                  <TableRow key={row.login_id}>
                    <TableCell>{profileName(row.profiles)}</TableCell>
                    <TableCell>{formatDateTime(row.login_time)}</TableCell>
                    <TableCell>{formatDateTime(row.logout_time)}</TableCell>
                    <TableCell>{row.ip_address || "—"}</TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {row.device_info || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : tab === "transactions" ? (
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Audit events related to finance and announcements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(transactions ?? []).map((row) => (
                  <TableRow key={row.audit_id}>
                    <TableCell>{formatDateTime(row.created_at)}</TableCell>
                    <TableCell>{profileName(row.profiles)}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell className="max-w-[320px] truncate">
                      {row.description || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>User Activities</CardTitle>
            <CardDescription>All recorded audit events</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(auditLogs ?? []).map((row) => (
                  <TableRow key={row.audit_id}>
                    <TableCell>{formatDateTime(row.created_at)}</TableCell>
                    <TableCell>{profileName(row.profiles)}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.table_name || "—"}</TableCell>
                    <TableCell className="max-w-[280px] truncate">
                      {row.description || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
