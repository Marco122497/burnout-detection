"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  KeyRoundIcon,
  Loader2,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  UserRoundCheckIcon,
  UserRoundPlusIcon,
  UserRoundXIcon,
} from "lucide-react";

import {
  createGuidanceUser,
  deleteManagedUser,
  resetUserPassword,
  toggleUserStatus,
  updateUser,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { useActionToast } from "@/hooks/use-action-toast";
import { useTablePagination } from "@/hooks/use-table-pagination";
import {
  DeleteConfirmDialog,
} from "@/components/shared/delete-confirm-dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
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

function nameInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteManagedUser,
    initialState
  );

  useActionToast(createState);
  useActionToast(updateState);
  useActionToast(toggleState);
  useActionToast(resetState);
  useActionToast(deleteState);

  useEffect(() => {
    if (createState.success) setAddOpen(false);
  }, [createState]);

  useEffect(() => {
    if (updateState.success) setEditingId(null);
  }, [updateState]);

  useEffect(() => {
    if (resetState.success) setResetId(null);
  }, [resetState]);

  useEffect(() => {
    if (deleteState.success) setDeletingId(null);
  }, [deleteState.success]);

  useEffect(() => {
    if (toggleState.success) setTogglingId(null);
  }, [toggleState.success]);

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
  const deleting = admins.find((a) => a.id === deletingId) ?? null;
  const toggling = admins.find((a) => a.id === togglingId) ?? null;
  const deleteFormId = `delete-admin-${deletingId ?? "none"}`;
  const toggleFormId = `toggle-admin-${togglingId ?? "none"}`;

  function closeAdd(open: boolean) {
    setAddOpen(open);
  }

  function closeEdit(open: boolean) {
    if (!open) setEditingId(null);
  }

  function closeReset(open: boolean) {
    if (!open) setResetId(null);
  }

  function closeDelete(open: boolean) {
    if (!open) setDeletingId(null);
  }

  function closeToggle(open: boolean) {
    if (!open) setTogglingId(null);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Guidance/admin accounts</CardTitle>
            <CardDescription>
              Create, edit, activate/deactivate, reset passwords, or delete
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
                        <div className="flex items-start gap-2.5">
                          <Avatar className="size-8 shrink-0">
                            {admin.profile_picture ? (
                              <AvatarImage
                                src={admin.profile_picture}
                                alt={admin.full_name}
                              />
                            ) : null}
                            <AvatarFallback className="text-xs">
                              {nameInitials(admin.first_name, admin.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium">
                              {admin.full_name}
                              {admin.id === currentUserId ? (
                                <span className="ml-1.5 text-xs text-muted-foreground">
                                  (you)
                                </span>
                              ) : null}
                            </p>
                            {admin.email ? (
                              <p className="truncate text-xs text-muted-foreground">
                                {admin.email}
                              </p>
                            ) : null}
                          </div>
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
                                  variant="ghost"
                                  aria-label="Edit"
                                  onClick={() => setEditingId(admin.id)}
                                >
                                  <PencilIcon />
                                </Button>
                              }
                            />
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
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
                                  onClick={() => setTogglingId(admin.id)}
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
                              {admin.id === currentUserId && admin.is_active
                                ? "You cannot deactivate your own account"
                                : admin.is_active
                                  ? "Deactivate"
                                  : "Activate"}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  aria-label="Reset password"
                                  onClick={() => setResetId(admin.id)}
                                >
                                  <KeyRoundIcon />
                                </Button>
                              }
                            />
                            <TooltipContent>Reset password</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger
                              render={
                                <Button
                                  type="button"
                                  size="icon-sm"
                                  variant="ghost"
                                  aria-label="Delete admin"
                                  disabled={
                                    deletePending || admin.id === currentUserId
                                  }
                                  onClick={() => setDeletingId(admin.id)}
                                >
                                  <Trash2Icon />
                                </Button>
                              }
                            />
                            <TooltipContent>
                              {admin.id === currentUserId
                                ? "You cannot delete your own account"
                                : "Delete"}
                            </TooltipContent>
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
                <PasswordInput
                  id="admin-create-password"
                  name="password"
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
                <PasswordInput
                  id="admin-reset-new_password"
                  name="new_password"
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

      <AlertDialog
        open={togglingId != null}
        onOpenChange={(open) => {
          if (togglePending) return;
          closeToggle(open);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia
              className={
                toggling?.is_active
                  ? "bg-destructive/10 text-destructive"
                  : undefined
              }
            >
              {toggling?.is_active ? (
                <UserRoundXIcon />
              ) : (
                <UserRoundCheckIcon />
              )}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {toggling?.is_active ? "Deactivate admin?" : "Activate admin?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggling
                ? toggling.is_active
                  ? `This will deactivate “${toggling.full_name}”. They will not be able to sign in until activated again.`
                  : `This will activate “${toggling.full_name}” and restore their access.`
                : "Update this admin’s account status."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {toggling ? (
            <form id={toggleFormId} action={toggleAction}>
              <input type="hidden" name="user_id" value={toggling.id} />
              <input
                type="hidden"
                name="is_active"
                value={toggling.is_active ? "0" : "1"}
              />
            </form>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={togglePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form={toggleFormId}
              variant={toggling?.is_active ? "destructive" : "default"}
              disabled={togglePending || !toggling}
            >
              {togglePending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : toggling?.is_active ? (
                "Deactivate"
              ) : (
                "Activate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteConfirmDialog
        open={deletingId != null}
        onOpenChange={closeDelete}
        pending={deletePending}
        title="Delete admin?"
        description={
          deleting
            ? `This will permanently remove “${deleting.full_name}”. Admins with counseling records cannot be deleted — deactivate them instead.`
            : "This will permanently remove the admin."
        }
        formId={deleteFormId}
        formAction={deleteAction}
      >
        {deleting ? (
          <>
            <input type="hidden" name="user_id" value={deleting.id} />
            <input type="hidden" name="role" value="Guidance Counselor" />
          </>
        ) : null}
      </DeleteConfirmDialog>
    </div>
  );
}
