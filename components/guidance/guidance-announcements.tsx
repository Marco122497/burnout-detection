"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, PencilIcon, TrashIcon } from "lucide-react";

import {
  createGuidanceAnnouncement,
  deleteGuidanceAnnouncement,
  publishGuidanceAnnouncement,
  updateGuidanceAnnouncement,
  type AnnouncementActionState,
} from "@/app/actions/announcements";
import { useActionToast } from "@/hooks/use-action-toast";
import type { Department } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/auth/roles";
import type { AnnouncementRow } from "@/lib/instructor/queries";
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

const initialState: AnnouncementActionState = {};
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function targetLabel(item: AnnouncementRow, departments: Department[]) {
  if (
    !item.department_id &&
    !item.course &&
    item.year_level == null &&
    !item.section
  ) {
    return "Entire university";
  }

  const dept = departments.find((d) => d.department_id === item.department_id);
  const parts = [
    dept
      ? `${dept.department_code} — ${dept.department_name}`
      : item.department_id
        ? `Department #${item.department_id}`
        : null,
    item.course ? `Course: ${item.course}` : null,
    item.year_level != null ? `Year ${item.year_level}` : null,
    item.section ? `Section ${item.section}` : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

export function GuidanceAnnouncementsManager({
  announcements,
  departments,
  courseOptions,
  sectionOptions,
}: {
  announcements: AnnouncementRow[];
  departments: Department[];
  courseOptions: string[];
  sectionOptions: string[];
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createState, createAction, createPending] = useActionState(
    createGuidanceAnnouncement,
    initialState
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateGuidanceAnnouncement,
    initialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteGuidanceAnnouncement,
    initialState
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishGuidanceAnnouncement,
    initialState
  );

  useActionToast(createState);
  useActionToast(updateState);
  useActionToast(deleteState);
  useActionToast(publishState);

  const editing = announcements.find((a) => a.announcement_id === editingId);
  const courses = useMemo(() => courseOptions, [courseOptions]);
  const sections = useMemo(() => sectionOptions, [sectionOptions]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {editing ? "Edit announcement" : "Create announcement"}
          </CardTitle>
          <CardDescription>
            Target the entire university, or narrow by department, course, year
            level, or section.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            key={editing?.announcement_id ?? "create"}
            action={editing ? updateAction : createAction}
            className="space-y-4"
          >
            {editing ? (
              <input
                type="hidden"
                name="announcement_id"
                value={editing.announcement_id}
              />
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                defaultValue={editing?.title ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <textarea
                id="content"
                name="content"
                required
                rows={5}
                defaultValue={editing?.content ?? ""}
                className="min-h-28 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="department_id">Department</Label>
                <select
                  id="department_id"
                  name="department_id"
                  defaultValue={
                    editing?.department_id != null
                      ? String(editing.department_id)
                      : ""
                  }
                  className={selectClassName}
                >
                  <option value="">Entire university</option>
                  {departments.map((dept) => (
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
                <Label htmlFor="course">Course</Label>
                <Input
                  id="course"
                  name="course"
                  list="guidance-course-options"
                  defaultValue={editing?.course ?? ""}
                  placeholder="Optional"
                />
                <datalist id="guidance-course-options">
                  {courses.map((course) => (
                    <option key={course} value={course} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year_level">Year level</Label>
                <select
                  id="year_level"
                  name="year_level"
                  defaultValue={
                    editing?.year_level != null
                      ? String(editing.year_level)
                      : ""
                  }
                  className={selectClassName}
                >
                  <option value="">All years</option>
                  {[1, 2, 3, 4, 5, 6].map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  name="section"
                  list="guidance-section-options"
                  defaultValue={editing?.section ?? ""}
                  placeholder="Optional"
                />
                <datalist id="guidance-section-options">
                  {sections.map((section) => (
                    <option key={section} value={section} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="publish"
                  value="1"
                  defaultChecked={editing?.is_active ?? true}
                  className="size-4 rounded border"
                />
                Publish immediately
              </label>
              <Button
                type="submit"
                disabled={editing ? updatePending : createPending}
              >
                {(editing ? updatePending : createPending) ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : editing ? (
                  "Save changes"
                ) : (
                  "Create announcement"
                )}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="outline"
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
          <CardTitle>Your announcements</CardTitle>
          <CardDescription>
            Edit, publish drafts, or delete announcements you created.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No announcements yet.
            </p>
          ) : (
            announcements.map((item) => (
              <div
                key={item.announcement_id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{item.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {item.is_active ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {targetLabel(item, departments)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {item.content}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(item.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(item.announcement_id)}
                  >
                    <PencilIcon className="size-3.5" />
                    Edit
                  </Button>
                  {!item.is_active ? (
                    <form action={publishAction}>
                      <input
                        type="hidden"
                        name="announcement_id"
                        value={item.announcement_id}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        disabled={publishPending}
                      >
                        Publish
                      </Button>
                    </form>
                  ) : null}
                  <form action={deleteAction}>
                    <input
                      type="hidden"
                      name="announcement_id"
                      value={item.announcement_id}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="destructive"
                      disabled={deletePending}
                    >
                      <TrashIcon className="size-3.5" />
                      Delete
                    </Button>
                  </form>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
