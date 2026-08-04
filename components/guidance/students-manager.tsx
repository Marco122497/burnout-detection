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
  createStudent,
  resetUserPassword,
  toggleUserStatus,
  updateUser,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { useActionToast } from "@/hooks/use-action-toast";
import { useTablePagination } from "@/hooks/use-table-pagination";
import { TablePagination } from "@/components/shared/table-pagination";
import type { Department } from "@/lib/auth/roles";
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

function formatYearLevel(year: number) {
  const ordinals: Record<number, string> = {
    1: "1st",
    2: "2nd",
    3: "3rd",
    4: "4th",
  };
  return `${ordinals[year] ?? `${year}th`} Year`;
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function StudentsManager({
  students,
  departments,
}: {
  students: UserListItem[];
  departments: Department[];
}) {
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);

  const [createState, createAction, createPending] = useActionState(
    createStudent,
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

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [
        student.full_name,
        student.email ?? "",
        student.student_number ?? "",
        student.section ?? "",
        student.department_code ?? "",
        student.department_name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [students, search]);

  const {
    page,
    pageSize,
    totalItems,
    pageItems,
    setPage,
    setPageSize,
  } = useTablePagination(filteredStudents);

  useEffect(() => {
    setPage(1);
  }, [search, setPage]);

  const editing = students.find((s) => s.id === editingId) ?? null;
  const resetting = students.find((s) => s.id === resetId) ?? null;
  const activeDepartments = departments.filter((d) => d.is_active);

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
            <CardTitle>Student list</CardTitle>
            <CardDescription>
              Search, edit, activate/deactivate, and reset passwords.
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setAddOpen(true)}>
            <PlusIcon className="size-4" />
            Add student
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, student number, section, or course…"
              className="pl-8"
            />
          </div>

          {filteredStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {students.length === 0
                ? "No students yet."
                : "No students match your search."}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Student no.</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Year & Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{student.full_name}</p>
                          {student.email ? (
                            <p className="text-xs text-muted-foreground">
                              {student.email}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>{student.student_number || "—"}</TableCell>
                      <TableCell>
                        {student.department_code
                          ? `${student.department_code} · ${student.department_name}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {[
                          student.year_level
                            ? formatYearLevel(student.year_level)
                            : null,
                          student.section || null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            student.is_active
                              ? "text-emerald-700"
                              : "text-muted-foreground"
                          }
                        >
                          {student.is_active ? "Active" : "Inactive"}
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
                                  onClick={() => setEditingId(student.id)}
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
                              value={student.id}
                            />
                            <input
                              type="hidden"
                              name="is_active"
                              value={student.is_active ? "0" : "1"}
                            />
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="submit"
                                    size="icon-sm"
                                    variant="ghost"
                                    disabled={togglePending}
                                    aria-label={
                                      student.is_active
                                        ? "Deactivate"
                                        : "Activate"
                                    }
                                  >
                                    {student.is_active ? (
                                      <UserRoundXIcon />
                                    ) : (
                                      <UserRoundCheckIcon />
                                    )}
                                  </Button>
                                }
                              />
                              <TooltipContent>
                                {student.is_active ? "Deactivate" : "Activate"}
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
                                  onClick={() => setResetId(student.id)}
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
                id="students-rows-per-page"
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
            <AlertDialogTitle>Add student</AlertDialogTitle>
            <AlertDialogDescription>
              Create a student account and assign their course, year level, and
              section.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {addOpen ? (
            <form
              key="create-student"
              id="create-student-form"
              action={createAction}
              className="grid gap-x-3 gap-y-2.5 sm:grid-cols-2"
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="student-create-email">Email</Label>
                <Input
                  id="student-create-email"
                  name="email"
                  type="email"
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="student-create-password">
                  Temporary password
                </Label>
                <Input
                  id="student-create-password"
                  name="password"
                  type="password"
                  minLength={8}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-create-first_name">First name</Label>
                <Input
                  id="student-create-first_name"
                  name="first_name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-create-middle_name">Middle name</Label>
                <Input id="student-create-middle_name" name="middle_name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-create-last_name">Last name</Label>
                <Input
                  id="student-create-last_name"
                  name="last_name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-create-suffix">Suffix</Label>
                <Input id="student-create-suffix" name="suffix" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="student-create-student_number">
                  Student number
                </Label>
                <Input
                  id="student-create-student_number"
                  name="student_number"
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="student-create-department_id">Course</Label>
                <select
                  id="student-create-department_id"
                  name="department_id"
                  required
                  defaultValue=""
                  className={selectClassName}
                >
                  <option value="" disabled>
                    Select course
                  </option>
                  {activeDepartments.map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_code} — {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-create-year_level">Year level</Label>
                <select
                  id="student-create-year_level"
                  name="year_level"
                  required
                  defaultValue=""
                  className={selectClassName}
                >
                  <option value="" disabled>
                    Select year
                  </option>
                  {[1, 2, 3, 4].map((year) => (
                    <option key={year} value={year}>
                      {formatYearLevel(year)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="student-create-section">Section</Label>
                <Input id="student-create-section" name="section" />
              </div>
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={createPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="create-student-form"
              disabled={createPending}
            >
              {createPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating…
                </>
              ) : (
                "Create student"
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
            <AlertDialogTitle>Edit student</AlertDialogTitle>
            <AlertDialogDescription>
              {editing
                ? `Update details for ${editing.full_name}.`
                : "Update details for this student."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {editing ? (
            <form
              key={`edit-${editing.id}-${editing.updated_at}`}
              id="edit-student-form"
              action={updateAction}
              className="grid gap-4 sm:grid-cols-2"
            >
              <input type="hidden" name="user_id" value={editing.id} />
              <div className="space-y-2">
                <Label htmlFor="student-edit-first_name">First name</Label>
                <Input
                  id="student-edit-first_name"
                  name="first_name"
                  required
                  defaultValue={editing.first_name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-edit-middle_name">Middle name</Label>
                <Input
                  id="student-edit-middle_name"
                  name="middle_name"
                  defaultValue={editing.middle_name ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-edit-last_name">Last name</Label>
                <Input
                  id="student-edit-last_name"
                  name="last_name"
                  required
                  defaultValue={editing.last_name}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-edit-suffix">Suffix</Label>
                <Input
                  id="student-edit-suffix"
                  name="suffix"
                  defaultValue={editing.suffix ?? ""}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="student-edit-student_number">
                  Student number
                </Label>
                <Input
                  id="student-edit-student_number"
                  name="student_number"
                  defaultValue={editing.student_number ?? ""}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="student-edit-contact_number">
                  Contact number
                </Label>
                <Input
                  id="student-edit-contact_number"
                  name="contact_number"
                  defaultValue={editing.contact_number ?? ""}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="student-edit-department_id">Course</Label>
                <select
                  id="student-edit-department_id"
                  name="department_id"
                  defaultValue={editing.department_id?.toString() ?? ""}
                  className={selectClassName}
                >
                  <option value="" disabled>
                    Select course
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
              <div className="space-y-2">
                <Label htmlFor="student-edit-year_level">Year level</Label>
                <select
                  id="student-edit-year_level"
                  name="year_level"
                  defaultValue={editing.year_level?.toString() ?? ""}
                  className={selectClassName}
                >
                  <option value="" disabled>
                    Select year
                  </option>
                  {[1, 2, 3, 4].map((year) => (
                    <option key={year} value={year}>
                      {formatYearLevel(year)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-edit-section">Section</Label>
                <Input
                  id="student-edit-section"
                  name="section"
                  defaultValue={editing.section ?? ""}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="student-edit-is_active">Status</Label>
                <select
                  id="student-edit-is_active"
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
            <AlertDialogCancel disabled={updatePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="edit-student-form"
              disabled={updatePending || !editing}
            >
              {updatePending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Save student"
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
                : "Set a new temporary password for this student."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {resetting ? (
            <form id="reset-student-password-form" action={resetAction}>
              <input type="hidden" name="user_id" value={resetting.id} />
              <div className="space-y-2">
                <Label htmlFor="student-reset-new_password">
                  New password
                </Label>
                <Input
                  id="student-reset-new_password"
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
              form="reset-student-password-form"
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
