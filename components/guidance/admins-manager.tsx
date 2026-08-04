"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  KeyRoundIcon,
  Loader2,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  UserRoundCheckIcon,
  UserRoundPlusIcon,
  UserRoundXIcon,
} from "lucide-react";

import {
  createGuidanceUser,
  resetUserPassword,
  toggleUserStatus,
  updateUser,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { useActionToast } from "@/hooks/use-action-toast";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { TablePagination } from "@/components/shared/table-pagination";
import type { UserListItem } from "@/lib/guidance/queries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const initialState: GuidanceActionState = {};
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdminsManager({
  admins,
  currentUserId,
}: {
  admins: UserListItem[];
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);

  const [createState, createAction, createPending] = useActionState(
    createGuidanceUser,
    initialState
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateUser,
    initialState
  );
  const [toggleState, toggleAction, togglePending] = useActionState(
    toggleUserStatus,
    initialState
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetUserPassword,
    initialState
  );

  useActionToast(createState);
  useActionToast(updateState);
  useActionToast(toggleState);
  useActionToast(resetState);

  useEffect(() => {
    if (createState.success) setAddOpen(false);
  }, [createState]);

  useEffect(() => {
    if (updateState.success) setEditingId(null);
  }, [updateState]);

  useEffect(() => {
    if (resetState.success) setResetId(null);
  }, [resetState]);

  const filteredAdmins = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return admins;
    return admins.filter((admin) =>
      [
        admin.full_name,
        admin.email ?? "",
        admin.employee_no ?? "",
        admin.designation ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [admins, search]);

  const {
    page,
    pageSize,
    totalItems,
    pageItems,
    setPage,
    setPageSize,
  } = useTablePagination(filteredAdmins);

  useEffect(() => {
    setPage(1);
  }, [search, setPage]);

  const editing = admins.find((a) => a.id === editingId) ?? null;
  const resetting = admins.find((a) => a.id === resetId) ?? null;

  function closeAdd(open: boolean) {
    setAddOpen(open);
  }

  function closeEdit(open: boolean) {
    if (!open) setEditingId(null);
  }

  function closeReset(open: boolean) {
    if (!open) setResetId(null);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Guidance/admin accounts</CardTitle>
            <CardDescription>
              Create, edit, activate/deactivate, and reset passwords for
              guidance counselor accounts.
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setAddOpen(true)}>
            <PlusIcon className="size-4" />
            Add admin
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, employee number, or designation…"
              className="pl-8"
            />
          </div>

          {filteredAdmins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {admins.length === 0
                ? "No guidance/admin accounts yet."
                : "No accounts match your search."}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Employee no.</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {admin.full_name}
                            {admin.id === currentUserId ? (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                (you)
                              </span>
                            ) : null}
                          </p>
                          {admin.email ? (
                            <p className="text-xs text-muted-foreground">
                              {admin.email}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{admin.employee_no || "—"}</TableCell>
                      <TableCell>{admin.designation || "—"}</TableCell>
                      <TableCell>
                        <span
                          className={
                            admin.is_active
                              ? "text-emerald-700"
                              : "text-muted-foreground"
                          }
                        >
                          {admin.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="outline"
                                  aria-label="Edit"
                                  onClick={() => setEditingId(admin.id)}
                                >
                                  <PencilIcon />
                                </Button>
                              }
                            />
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <form action={toggleAction}>
                            <input
                              type="hidden"
                              name="user_id"
                              value={admin.id}
                            />
                            <input
                              type="hidden"
                              name="is_active"
                              value={admin.is_active ? "0" : "1"}
                            />
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="submit"
                                    size="icon-sm"
                                    variant="ghost"
                                    disabled={
                                      togglePending ||
                                      (admin.id === currentUserId &&
                                        admin.is_active)
                                    }
                                    aria-label={
                                      admin.is_active
                                        ? "Deactivate"
                                        : "Activate"
                                    }
                                  >
                                    {admin.is_active ? (
                                      <UserRoundXIcon />
                                    ) : (
                                      <UserRoundCheckIcon />
                                    )}
                                  </Button>
                                }
                              />
                              <TooltipContent>
                                {admin.is_active ? "Deactivate" : "Activate"}
                              </TooltipContent>
                            </Tooltip>
                          </form>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="outline"
                                  aria-label="Reset password"
                                  onClick={() => setResetId(admin.id)}
                                >
                                  <KeyRoundIcon />
                                </Button>
                              }
                            />
                            <TooltipContent>Reset password</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                id="admins-rows-per-page"
                page={page}
                pageSize={pageSize}
                totalItems={totalItems}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                className="justify-end gap-4 sm:justify-end"
              />
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={addOpen} onOpenChange={closeAdd}>
        <AlertDialogContent className="max-h-[90vh] gap-3 overflow-y-auto data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <UserRoundPlusIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Add guidance/admin account</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new guidance counselor account with full admin access.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {addOpen ? (
            <form
              key="create-admin"
              id="create-admin-form"
              action={createAction}
              className="grid gap-x-3 gap-y-2.5 sm:grid-cols-2"
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="admin-create-email">Email</Label>
                <Input
                  id="admin-create-email"
                  name="email"
                  type="email"
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="admin-create-password">
                  Temporary password
                </Label>
                <Input
                  id="admin-create-password"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-create-first_name">First name</Label>
                <Input
                  id="admin-create-first_name"
                  name="first_name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-create-middle_name">Middle name</Label>
                <Input id="admin-create-middle_name" name="middle_name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-create-last_name">Last name</Label>
                <Input id="admin-create-last_name" name="last_name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-create-suffix">Suffix</Label>
                <Input id="admin-create-suffix" name="suffix" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-create-employee_no">Employee no.</Label>
                <Input id="admin-create-employee_no" name="employee_no" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="admin-create-designation">Designation</Label>
                <Input id="admin-create-designation" name="designation" />
              </div>
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={createPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="create-admin-form"
              disabled={createPending}
            >
              {createPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating…
                </>
              ) : (
                "Create account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={editingId !== null} onOpenChange={closeEdit}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <PencilIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Edit guidance/admin account</AlertDialogTitle>
            <AlertDialogDescription>
              {editing
                ? `Update details for ${editing.full_name}.`
                : "Update details for this account."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {editing ? (
            <form
              key={`edit-${editing.id}-${editing.updated_at}`}
              id="edit-admin-form"
              action={updateAction}
              className="grid gap-4 sm:grid-cols-2"
            >
              <input type="hidden" name="user_id" value={editing.id} />
              <div className="space-y-2">
                <Label htmlFor="admin-edit-first_name">First name</Label>
                <Input
                  id="admin-edit-first_name"
                  name="first_name"
                  required
                  defaultValue={editing.first_name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-edit-middle_name">Middle name</Label>
                <Input
                  id="admin-edit-middle_name"
                  name="middle_name"
                  defaultValue={editing.middle_name ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-edit-last_name">Last name</Label>
                <Input
                  id="admin-edit-last_name"
                  name="last_name"
                  required
                  defaultValue={editing.last_name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-edit-suffix">Suffix</Label>
                <Input
                  id="admin-edit-suffix"
                  name="suffix"
                  defaultValue={editing.suffix ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-edit-employee_no">Employee no.</Label>
                <Input
                  id="admin-edit-employee_no"
                  name="employee_no"
                  defaultValue={editing.employee_no ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-edit-designation">Designation</Label>
                <Input
                  id="admin-edit-designation"
                  name="designation"
                  defaultValue={editing.designation ?? ""}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="admin-edit-contact_number">
                  Contact number
                </Label>
                <Input
                  id="admin-edit-contact_number"
                  name="contact_number"
                  defaultValue={editing.contact_number ?? ""}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="admin-edit-is_active">Status</Label>
                {editing.id === currentUserId ? (
                  <input type="hidden" name="is_active" value="1" />
                ) : null}
                <select
                  id="admin-edit-is_active"
                  name={editing.id === currentUserId ? undefined : "is_active"}
                  defaultValue={editing.is_active ? "1" : "0"}
                  className={selectClassName}
                  disabled={editing.id === currentUserId}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
                {editing.id === currentUserId ? (
                  <p className="text-xs text-muted-foreground">
                    You cannot change the status of your own account.
                  </p>
                ) : null}
              </div>
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="edit-admin-form"
              disabled={updatePending || !editing}
            >
              {updatePending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Save account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetId !== null} onOpenChange={closeReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <KeyRoundIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Reset password</AlertDialogTitle>
            <AlertDialogDescription>
              {resetting
                ? `Set a new temporary password for ${resetting.full_name}.`
                : "Set a new temporary password for this account."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {resetting ? (
            <form id="reset-admin-password-form" action={resetAction}>
              <input type="hidden" name="user_id" value={resetting.id} />
              <div className="space-y-2">
                <Label htmlFor="admin-reset-new_password">New password</Label>
                <Input
                  id="admin-reset-new_password"
                  name="new_password"
                  type="password"
                  minLength={8}
                  required
                />
              </div>
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="reset-admin-password-form"
              disabled={resetPending || !resetting}
            >
              {resetPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Save password"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
