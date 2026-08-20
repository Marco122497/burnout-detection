"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, MegaphoneIcon, PencilIcon, PlusIcon } from "lucide-react";

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
import { formatYearLevel } from "@/lib/utils";
import {
  DeleteConfirmDialog,
  DeleteIconButton,
} from "@/components/shared/delete-confirm-dialog";
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

const initialState: AnnouncementActionState = {};
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function targetLabel(item: AnnouncementRow, departments: Department[]) {
  const dept = departments.find((d) => d.department_id === item.department_id);
  const parts = [
    dept
      ? `${dept.department_code} — ${dept.department_name}`
      : item.department_id
        ? `Department #${item.department_id}`
        : "Entire department",
    item.year_level != null ? formatYearLevel(item.year_level) : null,
  ].filter(Boolean);

  return parts.join(" · ");
}

export function GuidanceAnnouncementsManager({
  announcements,
  departments,
}: {
  announcements: AnnouncementRow[];
  departments: Department[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

  useEffect(() => {
    if (createState.success) {
      setFormOpen(false);
      setEditingId(null);
    }
  }, [createState.success]);

  useEffect(() => {
    if (updateState.success) {
      setFormOpen(false);
      setEditingId(null);
    }
  }, [updateState.success]);

  useEffect(() => {
    if (deleteState.success) setDeletingId(null);
  }, [deleteState.success]);

  const editing = announcements.find((a) => a.announcement_id === editingId);
  const deleting = announcements.find((a) => a.announcement_id === deletingId);
  const deleteFormId = `delete-guidance-announcement-${deletingId ?? "none"}`;
  const formId = editing
    ? "edit-guidance-announcement-form"
    : "create-guidance-announcement-form";
  const formPending = editing ? updatePending : createPending;

  function openCreate() {
    setEditingId(null);
    setFormOpen(true);
  }

  function openEdit(id: number) {
    setEditingId(id);
    setFormOpen(true);
  }

  function closeForm(open: boolean) {
    if (formPending) return;
    setFormOpen(open);
    if (!open) setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Your announcements</CardTitle>
            <CardDescription>
              Edit, publish drafts, or delete announcements you created.
            </CardDescription>
          </div>
          <Button type="button" onClick={openCreate}>
            <PlusIcon className="size-4" />
            Create announcement
          </Button>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No announcements yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((item) => (
                  <TableRow key={item.announcement_id}>
                    <TableCell className="max-w-[16rem]">
                      <p className="font-medium">{item.title}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {targetLabel(item, departments)}
                    </TableCell>
                    <TableCell>
                      {item.is_active ? "Published" : "Draft"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(item.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Edit announcement"
                          onClick={() => openEdit(item.announcement_id)}
                        >
                          <PencilIcon />
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
                              variant="outline"
                              disabled={publishPending}
                            >
                              Publish
                            </Button>
                          </form>
                        ) : null}
                        <DeleteIconButton
                          label="Delete announcement"
                          disabled={deletePending}
                          onClick={() => setDeletingId(item.announcement_id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={formOpen} onOpenChange={closeForm}>
        <AlertDialogContent className="max-h-[90vh] gap-3 overflow-y-auto data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogMedia>
              {editing ? <PencilIcon /> : <MegaphoneIcon />}
            </AlertDialogMedia>
            <AlertDialogTitle>
              {editing ? "Edit announcement" : "Create announcement"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Target the entire department, or narrow by department and year
              level.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {formOpen ? (
            <form
              key={editing?.announcement_id ?? "create"}
              id={formId}
              action={editing ? updateAction : createAction}
              className="grid gap-x-3 gap-y-2.5 sm:grid-cols-2"
            >
              {editing ? (
                <input
                  type="hidden"
                  name="announcement_id"
                  value={editing.announcement_id}
                />
              ) : null}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="guidance-announcement-title">Title</Label>
                <Input
                  id="guidance-announcement-title"
                  name="title"
                  required
                  defaultValue={editing?.title ?? ""}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="guidance-announcement-content">Content</Label>
                <textarea
                  id="guidance-announcement-content"
                  name="content"
                  required
                  rows={5}
                  defaultValue={editing?.content ?? ""}
                  className="min-h-28 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guidance-announcement-department">
                  Department
                </Label>
                <select
                  id="guidance-announcement-department"
                  name="department_id"
                  defaultValue={
                    editing?.department_id != null
                      ? String(editing.department_id)
                      : ""
                  }
                  className={selectClassName}
                >
                  <option value="">Entire department</option>
                  {departments.map((dept) => (
                    <option key={dept.department_id} value={dept.department_id}>
                      {dept.department_code} — {dept.department_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guidance-announcement-year">Year level</Label>
                <select
                  id="guidance-announcement-year"
                  name="year_level"
                  defaultValue={
                    editing?.year_level != null &&
                    editing.year_level >= 1 &&
                    editing.year_level <= 4
                      ? String(editing.year_level)
                      : ""
                  }
                  className={selectClassName}
                >
                  <option value="">All years</option>
                  {[1, 2, 3, 4].map((year) => (
                    <option key={year} value={year}>
                      {formatYearLevel(year)}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  name="publish"
                  value="1"
                  defaultChecked={editing?.is_active ?? true}
                  className="size-4 rounded border"
                />
                Publish immediately
              </label>
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={formPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction type="submit" form={formId} disabled={formPending}>
              {formPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : editing ? (
                "Save changes"
              ) : (
                "Create announcement"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteConfirmDialog
        open={deletingId != null}
        onOpenChange={(open) => {
          if (!open) setDeletingId(null);
        }}
        pending={deletePending}
        title="Delete announcement?"
        description={
          deleting
            ? `This will permanently remove “${deleting.title}”. This cannot be undone.`
            : "This will permanently remove the announcement."
        }
        formId={deleteFormId}
        formAction={deleteAction}
      >
        {deleting ? (
          <input
            type="hidden"
            name="announcement_id"
            value={deleting.announcement_id}
          />
        ) : null}
      </DeleteConfirmDialog>
    </div>
  );
}
