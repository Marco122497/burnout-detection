import type { UserRole } from "@/lib/auth/roles";

export type AuditActionType =
  | "CREATE"
  | "READ"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "EXPORT"
  | "PREDICT";

export type AuditLogInput = {
  user_id: string | null;
  user_role?: UserRole | null;
  action: string;
  action_type: AuditActionType;
  table_name: string;
  record_id?: string | number | null;
  description?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
};

export function toAuditLogRow(input: AuditLogInput) {
  return {
    user_id: input.user_id,
    user_role: input.user_role ?? null,
    action: input.action,
    action_type: input.action_type,
    table_name: input.table_name,
    record_id:
      input.record_id === null || input.record_id === undefined
        ? null
        : String(input.record_id),
    description: input.description ?? null,
    ip_address: input.ip_address ?? null,
    user_agent: input.user_agent ?? null,
    old_values: input.old_values ?? null,
    new_values: input.new_values ?? null,
  };
}
