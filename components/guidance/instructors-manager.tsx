"use client";

import { useActionState, useEffect, useState } from "react";
import {
  KeyRoundIcon,
  Loader2,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UserRoundCheckIcon,
  UserRoundPlusIcon,
  UserRoundXIcon,
} from "lucide-react";

import {
  createInstructor,
  deleteManagedUser,
  resetInstructorPassword,
  toggleInstructorStatus,
  updateInstructor,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { DefaultInitialPasswordField } from "@/components/guidance/default-initial-password-field";
import { DEFAULT_INITIAL_PASSWORD_NOTE } from "@/lib/auth/defaults";
import { useActionToast } from "@/hooks/use-action-toast";
import { useTablePagination } from "@/hooks/use-table-pagination";
import {
  DeleteConfirmDialog,
} from "@/components/shared/delete-confirm-dialog";
import { TablePagination } from "@/components/shared/table-pagination";
import type { Department } from "@/lib/auth/roles";
import type { InstructorListItem } from "@/lib/guidance/queries";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const initialState: GuidanceActionState = {};
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function nameInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase() || "?";
}

export function InstructorsManager({
  instructors,
  departments,
}: {
  instructors: InstructorListItem[];
  departments: Department[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [createState, createAction, createPending] = useActionState(
    createInstructor,
    initialState
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateInstructor,
    initialState
  );
  const [toggleState, toggleAction, togglePending] = useActionState(
    toggleInstructorStatus,
    initialState
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetInstructorPassword,
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

  const editing = instructors.find((i) => i.id === editingId) ?? null;
  const resetting = instructors.find((i) => i.id === resetId) ?? null;
  const deleting = instructors.find((i) => i.id === deletingId) ?? null;
  const toggling = instructors.find((i) => i.id === togglingId) ?? null;
  const deleteFormId = `delete-instructor-${deletingId ?? "none"}`;
  const toggleFormId = `toggle-instructor-${togglingId ?? "none"}`;
  const editDialogOpen = editingId !== null;
  const resetDialogOpen = resetId !== null;
  const activeDepartments = departments.filter((d) => d.is_active);

  const {
    page,
    pageSize,
    totalItems,
    pageItems,
    setPage,
    setPageSize,
  } = useTablePagination(instructors);

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
            <CardTitle>Instructor list</CardTitle>
            <CardDescription>
              Activate/deactivate, edit details, reset passwords, or delete
              instructors.
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setAddOpen(true)}>
            <PlusIcon className="size-4" />
            Add instructor
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {instructors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No instructors yet.</p>
          ) : (
            <>
              <Table containerClassName="overflow-x-hidden">
                <TableHeader>
                  <TableRow>
                    <TableHead>Instructor</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Employee no.
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Designation
                    </TableHead>
                    <TableHead className="hidden lg:table-cell">
                      Department
                    </TableHead>
                    <TableHead className="w-10 text-right">
                      <span className="sr-only md:not-sr-only md:text-xs md:font-medium md:text-muted-foreground">
                        Actions
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((instructor) => (
                    <TableRow key={instructor.id}>
                      <TableCell>
                        <div className="flex min-w-0 items-start gap-2.5">
                          <div className="relative shrink-0">
                            <Avatar className="size-8">
                              {instructor.profile_picture ? (
                                <AvatarImage
                                  src={instructor.profile_picture}
                                  alt={instructor.full_name}
                                />
                              ) : null}
                              <AvatarFallback className="text-xs">
                                {nameInitials(
                                  instructor.first_name,
                                  instructor.last_name
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <span
                              className={
                                instructor.is_active
                                  ? "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background bg-emerald-500"
                                  : "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background bg-muted-foreground/50"
                              }
                              title={
                                instructor.is_active ? "Active" : "Inactive"
                              }
                              aria-label={
                                instructor.is_active ? "Active" : "Inactive"
                              }
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium wrap-break-word">
                              {instructor.full_name}
                            </p>
                            {instructor.email ? (
                              <p className="truncate text-xs text-muted-foreground">
                                {instructor.email}
                              </p>
                            ) : null}
                            <p className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
                              {[
                                instructor.employee_no || "—",
                                instructor.department_code || null,
                              ]
                                .filter(Boolean)
                                .join(" | ")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {instructor.employee_no || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {instructor.designation || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {instructor.department_name || "—"}
                      </TableCell>
                      <TableCell className="w-10 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                type="button"
                                size="icon-sm"
                                variant="ghost"
                                className="shrink-0"
                                aria-label={`Actions for ${instructor.full_name}`}
                              >
                                <MoreHorizontalIcon className="size-4" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end" className="min-w-44">
                            <DropdownMenuItem
                              onClick={() => setEditingId(instructor.id)}
                            >
                              <PencilIcon />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={togglePending}
                              onClick={() => setTogglingId(instructor.id)}
                            >
                              {instructor.is_active ? (
                                <UserRoundXIcon />
                              ) : (
                                <UserRoundCheckIcon />
                              )}
                              {instructor.is_active
                                ? "Deactivate"
                                : "Activate"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setResetId(instructor.id)}
                            >
                              <KeyRoundIcon />
                              Reset password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              disabled={deletePending}
                              onClick={() => setDeletingId(instructor.id)}
                            >
                              <Trash2Icon />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                id="instructors-rows-per-page"
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
            <AlertDialogTitle>Add instructor</AlertDialogTitle>
            <AlertDialogDescription>
              Create an instructor account and assign them to a department.{" "}
              {DEFAULT_INITIAL_PASSWORD_NOTE}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {addOpen ? (
            <form
              key="create-instructor"
              id="create-instructor-form"
              action={createAction}
              className="grid gap-x-3 gap-y-2.5 sm:grid-cols-2"
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="create-email">Email</Label>
                <Input id="create-email" name="email" type="email" required />
              </div>
              <DefaultInitialPasswordField id="create-initial-password" />
              <div className="space-y-1.5">
                <Label htmlFor="create-first_name">First name</Label>
                <Input id="create-first_name" name="first_name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-middle_name">Middle name</Label>
                <Input id="create-middle_name" name="middle_name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-last_name">Last name</Label>
                <Input id="create-last_name" name="last_name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-suffix">Suffix</Label>
                <Input id="create-suffix" name="suffix" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-employee_no">Employee no.</Label>
                <Input id="create-employee_no" name="employee_no" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-designation">Designation</Label>
                <Input id="create-designation" name="designation" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="create-department_id">Department</Label>
                <select
                  id="create-department_id"
                  name="department_id"
                  required
                  defaultValue=""
                  className={selectClassName}
                >
                  <option value="" disabled>
                    Select department
                  </option>
                  {activeDepartments.map((dept) => (
                    <option
                      key={dept.department_id}
                      value={dept.department_id}
                    >
                      {dept.department_code} — {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={createPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="create-instructor-form"
              disabled={createPending}
            >
              {createPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating…
                </>
              ) : (
                "Create instructor"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={editDialogOpen} onOpenChange={closeEdit}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <PencilIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Edit instructor</AlertDialogTitle>
            <AlertDialogDescription>
              Update name, assignment, and status for this instructor.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {editing ? (
            <form
              key={`edit-${editing.id}-${editing.updated_at}`}
              id="edit-instructor-form"
              action={updateAction}
              className="grid gap-4 sm:grid-cols-2"
            >
              <input type="hidden" name="instructor_id" value={editing.id} />
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  required
                  defaultValue={editing.email ?? ""}
                />
                <p className="text-xs text-muted-foreground">
                  Used for login. Fix typos here if the account was created with
                  the wrong email.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-first_name">First name</Label>
                <Input
                  id="edit-first_name"
                  name="first_name"
                  required
                  defaultValue={editing.first_name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-middle_name">Middle name</Label>
                <Input
                  id="edit-middle_name"
                  name="middle_name"
                  defaultValue={editing.middle_name ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last_name">Last name</Label>
                <Input
                  id="edit-last_name"
                  name="last_name"
                  required
                  defaultValue={editing.last_name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-suffix">Suffix</Label>
                <Input
                  id="edit-suffix"
                  name="suffix"
                  defaultValue={editing.suffix ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-employee_no">Employee no.</Label>
                <Input
                  id="edit-employee_no"
                  name="employee_no"
                  defaultValue={editing.employee_no ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-designation">Designation</Label>
                <Input
                  id="edit-designation"
                  name="designation"
                  defaultValue={editing.designation ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact_number">Contact number</Label>
                <Input
                  id="edit-contact_number"
                  name="contact_number"
                  defaultValue={editing.contact_number ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-department_id">Department</Label>
                <select
                  id="edit-department_id"
                  name="department_id"
                  required
                  defaultValue={editing.department_id?.toString() ?? ""}
                  className={selectClassName}
                >
                  <option value="" disabled>
                    Select department
                  </option>
                  {activeDepartments.map((dept) => (
                    <option
                      key={dept.department_id}
                      value={dept.department_id}
                    >
                      {dept.department_code} — {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-is_active">Status</Label>
                <select
                  id="edit-is_active"
                  name="is_active"
                  defaultValue={editing.is_active ? "1" : "0"}
                  className={selectClassName}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="edit-instructor-form"
              disabled={updatePending || !editing}
            >
              {updatePending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Save instructor"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetDialogOpen} onOpenChange={closeReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <KeyRoundIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Reset password</AlertDialogTitle>
            <AlertDialogDescription>
              {resetting
                ? `Set a new temporary password for ${resetting.full_name}.`
                : "Set a new temporary password for this instructor."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {resetting ? (
            <form id="reset-instructor-password-form" action={resetAction}>
              <input
                type="hidden"
                name="instructor_id"
                value={resetting.id}
              />
              <div className="space-y-2">
                <Label htmlFor="reset-new_password">New password</Label>
                <PasswordInput
                  id="reset-new_password"
                  name="new_password"
                  minLength={8}
                  required
                />
              </div>
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="reset-instructor-password-form"
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
              {toggling?.is_active
                ? "Deactivate instructor?"
                : "Activate instructor?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggling
                ? toggling.is_active
                  ? `This will deactivate “${toggling.full_name}”. They will not be able to sign in until activated again.`
                  : `This will activate “${toggling.full_name}” and restore their access.`
                : "Update this instructor’s account status."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {toggling ? (
            <form id={toggleFormId} action={toggleAction}>
              <input
                type="hidden"
                name="instructor_id"
                value={toggling.id}
              />
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
        title="Delete instructor?"
        description={
          deleting
            ? `This will permanently remove “${deleting.full_name}” and announcements they created. This cannot be undone.`
            : "This will permanently remove the instructor."
        }
        formId={deleteFormId}
        formAction={deleteAction}
      >
        {deleting ? (
          <>
            <input type="hidden" name="user_id" value={deleting.id} />
            <input type="hidden" name="role" value="Instructor" />
          </>
        ) : null}
      </DeleteConfirmDialog>
    </div>
  );
}
