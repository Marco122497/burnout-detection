"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  assignInstructorDepartment,
  createInstructor,
  resetInstructorPassword,
  toggleInstructorStatus,
  updateInstructor,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { useActionToast } from "@/hooks/use-action-toast";
import type { Department } from "@/lib/auth/roles";
import type { InstructorListItem } from "@/lib/guidance/queries";
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

const initialState: GuidanceActionState = {};
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function InstructorsManager({
  instructors,
  departments,
}: {
  instructors: InstructorListItem[];
  departments: Department[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);

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
  const [assignState, assignAction, assignPending] = useActionState(
    assignInstructorDepartment,
    initialState
  );

  useActionToast(createState);
  useActionToast(updateState);
  useActionToast(toggleState);
  useActionToast(resetState);
  useActionToast(assignState);

  const editing = instructors.find((i) => i.id === editingId);
  const activeDepartments = departments.filter((d) => d.is_active);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {editing ? "Edit instructor" : "Create instructor account"}
          </CardTitle>
          <CardDescription>
            Guidance Counselors create and assign instructors to departments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            key={editing?.id ?? "create"}
            action={editing ? updateAction : createAction}
            className="grid gap-4 sm:grid-cols-2"
          >
            {editing ? (
              <input type="hidden" name="instructor_id" value={editing.id} />
            ) : null}

            {!editing ? (
              <>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="password">Temporary password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    minLength={8}
                    required
                  />
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="first_name">First name</Label>
              <Input
                id="first_name"
                name="first_name"
                required
                defaultValue={editing?.first_name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middle_name">Middle name</Label>
              <Input
                id="middle_name"
                name="middle_name"
                defaultValue={editing?.middle_name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                name="last_name"
                required
                defaultValue={editing?.last_name ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suffix">Suffix</Label>
              <Input
                id="suffix"
                name="suffix"
                defaultValue={editing?.suffix ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_no">Employee no.</Label>
              <Input
                id="employee_no"
                name="employee_no"
                defaultValue={editing?.employee_no ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                name="designation"
                defaultValue={editing?.designation ?? ""}
              />
            </div>
            {editing ? (
              <div className="space-y-2">
                <Label htmlFor="contact_number">Contact number</Label>
                <Input
                  id="contact_number"
                  name="contact_number"
                  defaultValue={editing.contact_number ?? ""}
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="department_id">Department</Label>
              <select
                id="department_id"
                name="department_id"
                required
                defaultValue={editing?.department_id?.toString() ?? ""}
                className={selectClassName}
              >
                <option value="" disabled>
                  Select department
                </option>
                {activeDepartments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.department_code} — {dept.department_name}
                  </option>
                ))}
              </select>
            </div>
            {editing ? (
              <div className="space-y-2">
                <Label htmlFor="is_active">Status</Label>
                <select
                  id="is_active"
                  name="is_active"
                  defaultValue={editing.is_active ? "1" : "0"}
                  className={selectClassName}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" disabled={createPending || updatePending}>
                {(createPending || updatePending) && (
                  <Loader2 className="animate-spin" />
                )}
                {editing ? "Save instructor" : "Create instructor"}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructor list</CardTitle>
          <CardDescription>
            Activate/deactivate, reassign department, or reset password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {instructors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No instructors yet.</p>
          ) : (
            instructors.map((instructor) => (
              <div
                key={instructor.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium">{instructor.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[
                        instructor.employee_no,
                        instructor.designation,
                        instructor.department_code
                          ? `${instructor.department_code} · ${instructor.department_name}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "No assignment"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {instructor.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(instructor.id)}
                    >
                      Edit
                    </Button>
                    <form action={toggleAction}>
                      <input
                        type="hidden"
                        name="instructor_id"
                        value={instructor.id}
                      />
                      <input
                        type="hidden"
                        name="is_active"
                        value={instructor.is_active ? "0" : "1"}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        disabled={togglePending}
                      >
                        {instructor.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setResetId(
                          resetId === instructor.id ? null : instructor.id
                        )
                      }
                    >
                      Reset password
                    </Button>
                  </div>
                </div>

                <form
                  action={assignAction}
                  className="flex flex-col gap-2 sm:flex-row sm:items-end"
                >
                  <input
                    type="hidden"
                    name="instructor_id"
                    value={instructor.id}
                  />
                  <div className="space-y-1 flex-1">
                    <Label>Assign / reassign department</Label>
                    <select
                      name="department_id"
                      defaultValue={instructor.department_id?.toString() ?? ""}
                      required
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
                  <Button type="submit" size="sm" disabled={assignPending}>
                    Assign
                  </Button>
                </form>

                {resetId === instructor.id ? (
                  <form
                    action={resetAction}
                    className="flex flex-col gap-2 sm:flex-row sm:items-end border-t pt-3"
                  >
                    <input
                      type="hidden"
                      name="instructor_id"
                      value={instructor.id}
                    />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor={`pwd-${instructor.id}`}>
                        New password
                      </Label>
                      <Input
                        id={`pwd-${instructor.id}`}
                        name="new_password"
                        type="password"
                        minLength={8}
                        required
                      />
                    </div>
                    <Button type="submit" size="sm" disabled={resetPending}>
                      {resetPending ? (
                        <Loader2 className="animate-spin" />
                      ) : null}
                      Save password
                    </Button>
                  </form>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
