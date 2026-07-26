"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, Trash2Icon, UserRoundIcon } from "lucide-react";

import {
  deleteUser,
  type UserActionState,
} from "@/app/actions/users";
import { ROLES, formatDateTime, type Profile } from "@/lib/auth/roles";
import { formatDate } from "@/lib/format";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const initialState: UserActionState = {};

function initials(user: Profile) {
  return `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase();
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-medium">{value || "—"}</dd>
    </div>
  );
}

function UserHoverCard({ user }: { user: Profile }) {
  return (
    <HoverCard>
      <HoverCardTrigger className="flex cursor-default items-center gap-2.5 rounded-md outline-none hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring/50">
        <Avatar size="sm">
          {user.profile_picture ? (
            <AvatarImage src={user.profile_picture} alt={user.full_name} />
          ) : null}
          <AvatarFallback>
            {initials(user) || <UserRoundIcon className="size-3.5" />}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium underline-offset-2 hover:underline">
          {user.full_name}
        </span>
      </HoverCardTrigger>
      <HoverCardContent side="top" align="start" className="w-80 p-3">
        <div className="flex items-start gap-3">
          <Avatar size="lg">
            {user.profile_picture ? (
              <AvatarImage src={user.profile_picture} alt={user.full_name} />
            ) : null}
            <AvatarFallback>
              {initials(user) || <UserRoundIcon className="size-5" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-0.5">
            <p className="truncate font-semibold leading-tight">
              {user.full_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {user.role} · {user.status ? "Active" : "Inactive"}
            </p>
          </div>
        </div>
        <dl className="mt-3 space-y-1.5 text-xs">
          <DetailRow label="Employee" value={user.employee_no} />
          <DetailRow label="Contact" value={user.contact_number} />
          <DetailRow label="Sex" value={user.sex} />
          <DetailRow
            label="Birth date"
            value={user.birth_date ? formatDate(user.birth_date) : null}
          />
          <DetailRow label="Address" value={user.address} />
          <DetailRow
            label="Last login"
            value={formatDateTime(user.last_login)}
          />
          <DetailRow
            label="Created"
            value={formatDateTime(user.created_at)}
          />
        </dl>
      </HoverCardContent>
    </HoverCard>
  );
}

function DeleteUserButton({
  userId,
  disabled,
}: {
  userId: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(deleteUser, initialState);

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="user_id" value={userId} />
      {state.error && (
        <span className="sr-only" role="alert">
          {state.error}
        </span>
      )}
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        disabled={pending || disabled}
        aria-label="Delete user"
        title={
          disabled
            ? "You cannot delete your own account"
            : state.error || "Delete user"
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <Trash2Icon />}
      </Button>
      {state.error && (
        <p className="mt-1 max-w-[180px] text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: Profile[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return users.filter((user) => {
      if (role && user.role !== role) return false;
      if (status === "active" && !user.status) return false;
      if (status === "inactive" && user.status) return false;

      if (!q) return true;

      const haystack = [
        user.full_name,
        user.first_name,
        user.last_name,
        user.employee_no,
        user.role,
        user.contact_number,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [users, query, role, status]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, employee no., role…"
          className="sm:col-span-1"
        />
        <select
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className={selectClassName}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          {ROLES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className={selectClassName}
          aria-label="Filter by status"
        >
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Employee No.</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="w-[48px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <UserHoverCard user={user} />
                </TableCell>
                <TableCell>{user.employee_no || "—"}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.status ? "Active" : "Inactive"}</TableCell>
                <TableCell>{formatDateTime(user.last_login)}</TableCell>
                <TableCell className="text-right">
                  <DeleteUserButton
                    userId={user.id}
                    disabled={user.id === currentUserId}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
