"use client";

import { useActionState, useMemo, useState } from "react";
import { Loader2, PencilIcon, TrashIcon } from "lucide-react";

import {
  createAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  updateAnnouncement,
  type AnnouncementActionState,
} from "@/app/actions/announcements";
import { useActionToast } from "@/hooks/use-action-toast";
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

function targetLabel(item: AnnouncementRow) {
  const parts = [
    item.course ? `Course: ${item.course}` : null,
    item.year_level != null ? `Year ${item.year_level}` : null,
    item.section ? `Section ${item.section}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Entire assigned department";
}

export function AnnouncementsManager({
  announcements,
  departmentName,
  courseOptions,
  sectionOptions,
}: {
  announcements: AnnouncementRow[];
  departmentName: string | null;
  courseOptions: string[];
  sectionOptions: string[];
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [createState, createAction, createPending] = useActionState(
    createAnnouncement,
    initialState
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateAnnouncement,
    initialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAnnouncement,
    initialState
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishAnnouncement,
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
            Target your assigned department
            {departmentName ? ` (${departmentName})` : ""}, optionally narrowed
            by course, year level, or section.
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
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="course">Course (optional)</Label>
                <Input
                  id="course"
                  name="course"
                  list="course-options"
                  defaultValue={editing?.course ?? ""}
                  placeholder="Leave blank for all courses"
                />
                <datalist id="course-options">
                  {courses.map((course) => (
                    <option key={course} value={course} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year_level">Year level (optional)</Label>
                <select
                  id="year_level"
                  name="year_level"
                  defaultValue={editing?.year_level?.toString() ?? ""}
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
                <Label htmlFor="section">Section (optional)</Label>
                <Input
                  id="section"
                  name="section"
                  list="section-options"
                  defaultValue={editing?.section ?? ""}
                  placeholder="Leave blank for all sections"
                />
                <datalist id="section-options">
                  {sections.map((section) => (
                    <option key={section} value={section} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                name="publish"
                value="0"
                variant="outline"
                disabled={createPending || updatePending}
              >
                {(createPending || updatePending) && (
                  <Loader2 className="animate-spin" />
                )}
                Save draft
              </Button>
              <Button
                type="submit"
                name="publish"
                value="1"
                disabled={createPending || updatePending}
              >
                {(createPending || updatePending) && (
                  <Loader2 className="animate-spin" />
                )}
                {editing ? "Save & publish" : "Publish"}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                >
                  Cancel edit
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
        <CardContent className="space-y-4">
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No announcements yet.
            </p>
          ) : (
            announcements.map((item) => (
              <div
                key={item.announcement_id}
                className="rounded-lg border p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{item.title}</p>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {item.is_active ? "Active" : "Draft"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Target: {targetLabel(item)}
                    </p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {item.content}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Updated {formatDateTime(item.updated_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(item.announcement_id)}
                    >
                      <PencilIcon />
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
                        <TrashIcon />
                        Delete
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
