"use client";

import { useActionState, useEffect, useState } from "react";
import { Building2Icon, Loader2, PencilIcon, PlusIcon, PowerIcon, Trash2Icon } from "lucide-react";

import {
  createDepartment,
  deleteDepartment,
  toggleDepartmentStatus,
  updateDepartment,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { useActionToast } from "@/hooks/use-action-toast";
import { useTablePagination } from "@/hooks/use-table-pagination";
import type { DepartmentWithCounts } from "@/lib/guidance/queries";
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
import { TablePagination } from "@/components/shared/table-pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const initialState: GuidanceActionState = {};
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const textareaClassName =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function DepartmentFields({
  department,
  includeStatus,
  includeCode = true,
  includeDescription = true,
  idPrefix = "",
}: {
  department?: DepartmentWithCounts | null;
  includeStatus?: boolean;
  includeCode?: boolean;
  includeDescription?: boolean;
  idPrefix?: string;
}) {
  const id = (name: string) => `${idPrefix}${name}`;

  return (
    <>
      {includeCode ? (
        <div className="space-y-2">
          <Label htmlFor={id("department_code")}>Code</Label>
          <Input
            id={id("department_code")}
            name="department_code"
            required
            defaultValue={department?.department_code ?? ""}
            placeholder="CS"
          />
        </div>
      ) : null}
      <div className={includeCode ? "space-y-2" : "space-y-2 sm:col-span-2"}>
        <Label htmlFor={id("department_name")}>Name</Label>
        <Input
          id={id("department_name")}
          name="department_name"
          required
          defaultValue={department?.department_name ?? ""}
          placeholder="Computer Science"
        />
      </div>
      {includeDescription ? (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={id("description")}>Description</Label>
          <textarea
            id={id("description")}
            name="description"
            rows={3}
            defaultValue={department?.description ?? ""}
            className={textareaClassName}
          />
        </div>
      ) : null}
      {includeStatus && department ? (
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={id("is_active")}>Status</Label>
          <select
            id={id("is_active")}
            name="is_active"
            defaultValue={department.is_active ? "1" : "0"}
            className={selectClassName}
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
      ) : null}
    </>
  );
}

export function DepartmentsManager({
  departments,
}: {
  departments: DepartmentWithCounts[];
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const [createState, createAction, createPending] = useActionState(
    createDepartment,
    initialState
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateDepartment,
    initialState
  );
  const [toggleState, toggleAction, togglePending] = useActionState(
    toggleDepartmentStatus,
    initialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteDepartment,
    initialState
  );

  useActionToast(createState);
  useActionToast(updateState);
  useActionToast(toggleState);
  useActionToast(deleteState);

  const editing =
    departments.find((d) => d.department_id === editingId) ?? null;
  const deleting =
    departments.find((d) => d.department_id === deletingId) ?? null;
  const editDialogOpen = editingId != null;
  const deleteDialogOpen = deletingId != null;

  const {
    page,
    pageSize,
    totalItems,
    pageItems,
    setPage,
    setPageSize,
  } = useTablePagination(departments);

  useEffect(() => {
    if (createState.success) {
      setAddOpen(false);
    }
  }, [createState.success]);

  useEffect(() => {
    if (updateState.success) {
      setEditingId(null);
    }
  }, [updateState.success]);

  useEffect(() => {
    if (deleteState.success) {
      setDeletingId(null);
    }
  }, [deleteState.success]);

  function openAddDepartment() {
    setAddOpen(true);
  }

  function closeAddDepartment(open: boolean) {
    setAddOpen(open);
  }

  function openEditDepartment(departmentId: number) {
    setEditingId(departmentId);
  }

  function closeEditDepartment(open: boolean) {
    if (!open) setEditingId(null);
  }

  function openDeleteDepartment(departmentId: number) {
    setDeletingId(departmentId);
  }

  function closeDeleteDepartment(open: boolean) {
    if (!open) setDeletingId(null);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Department list</CardTitle>
            <CardDescription>
              Student and instructor counts per department. Add or edit opens a
              dialog.
            </CardDescription>
          </div>
          <Button type="button" onClick={openAddDepartment}>
            <PlusIcon className="size-4" />
            Add Department
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {departments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No departments yet.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Code</th>
                      <th className="px-2 py-1.5 font-medium">Name</th>
                      <th className="px-2 py-1.5 font-medium">Students</th>
                      <th className="px-2 py-1.5 font-medium">Instructors</th>
                      <th className="px-2 py-1.5 font-medium">Status</th>
                      <th className="px-2 py-1.5 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((dept) => (
                      <tr
                        key={dept.department_id}
                        className="border-b last:border-0"
                      >
                        <td className="px-2 py-1.5 font-medium">
                          {dept.department_code}
                        </td>
                        <td className="px-2 py-1.5">{dept.department_name}</td>
                        <td className="px-2 py-1.5">{dept.student_count}</td>
                        <td className="px-2 py-1.5">{dept.instructor_count}</td>
                        <td className="px-2 py-1.5">
                          {dept.is_active ? "Active" : "Inactive"}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label="Edit department"
                                    onClick={() =>
                                      openEditDepartment(dept.department_id)
                                    }
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
                                name="department_id"
                                value={dept.department_id}
                              />
                              <input
                                type="hidden"
                                name="is_active"
                                value={dept.is_active ? "0" : "1"}
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
                                        dept.is_active
                                          ? "Deactivate department"
                                          : "Activate department"
                                      }
                                    >
                                      <PowerIcon />
                                    </Button>
                                  }
                                />
                                <TooltipContent>
                                  {dept.is_active ? "Deactivate" : "Activate"}
                                </TooltipContent>
                              </Tooltip>
                            </form>
                            <Tooltip>
                              <TooltipTrigger
                                render={
                                  <Button
                                    type="button"
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label="Delete department"
                                    onClick={() =>
                                      openDeleteDepartment(dept.department_id)
                                    }
                                  >
                                    <Trash2Icon />
                                  </Button>
                                }
                              />
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>  
              </div>
              <TablePagination
                id="departments-rows-per-page"
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

      <AlertDialog open={addOpen} onOpenChange={closeAddDepartment}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <PlusIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Add department</AlertDialogTitle>
            <AlertDialogDescription>
              Create an academic department. The department code is generated
              automatically from the name.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {addOpen ? (
            <form
              key="add-department"
              id="add-department-form"
              action={createAction}
              className="grid gap-4 sm:grid-cols-2"
            >
              <DepartmentFields
                idPrefix="add-"
                includeCode={false}
                includeDescription={false}
              />
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={createPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="add-department-form"
              disabled={createPending}
            >
              {createPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Add Department"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={editDialogOpen} onOpenChange={closeEditDepartment}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Building2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>Edit department</AlertDialogTitle>
            <AlertDialogDescription>
              Update department details and active status.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {editing ? (
            <form
              key={editing.department_id}
              id="edit-department-form"
              action={updateAction}
              className="grid gap-4 sm:grid-cols-2"
            >
              <input
                type="hidden"
                name="department_id"
                value={editing.department_id}
              />
              <DepartmentFields
                department={editing}
                includeStatus
                idPrefix="edit-"
              />
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="edit-department-form"
              disabled={updatePending || !editing}
            >
              {updatePending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(next) => {
          if (deletePending) return;
          closeDeleteDepartment(next);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete department?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `This will permanently remove “${deleting.department_name}” (${deleting.department_code}). Departments with assigned students or instructors cannot be deleted — deactivate them instead.`
                : "This will permanently remove the department."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleting ? (
            <form id="delete-department-form" action={deleteAction}>
              <input
                type="hidden"
                name="department_id"
                value={deleting.department_id}
              />
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="delete-department-form"
              variant="destructive"
              disabled={deletePending || !deleting}
            >
              {deletePending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2Icon />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
