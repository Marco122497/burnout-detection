"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, MegaphoneIcon, PencilIcon, PlusIcon } from "lucide-react";

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

function targetLabel(item: AnnouncementRow) {
  return item.year_level != null
    ? formatYearLevel(item.year_level)
    : "Entire department";
}

export function AnnouncementsManager({
  announcements,
  departmentName,
}: {
  announcements: AnnouncementRow[];
  departmentName: string | null;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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
  const deleteFormId = `delete-announcement-${deletingId ?? "none"}`;
  const formId = editing ? "edit-announcement-form" : "create-announcement-form";
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
              Edit, publish drafts, or delete announcements you created
              {departmentName ? ` for ${departmentName}` : ""}.
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
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((item) => (
                  <TableRow key={item.announcement_id}>
                    <TableCell className="max-w-[16rem]">
                      <p className="font-medium">{item.title}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground whitespace-pre-line">
                        {item.content}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {targetLabel(item)}
                    </TableCell>
                    <TableCell>
                      {item.is_active ? "Active" : "Draft"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(item.updated_at)}
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
              Target your assigned department
              {departmentName ? ` (${departmentName})` : ""}, or a specific
              year level.
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
                <Label htmlFor="announcement-title">Title</Label>
                <Input
                  id="announcement-title"
                  name="title"
                  required
                  defaultValue={editing?.title ?? ""}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="announcement-content">Content</Label>
                <textarea
                  id="announcement-content"
                  name="content"
                  required
                  rows={5}
                  defaultValue={editing?.content ?? ""}
                  className="min-h-28 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="announcement-year">Year level (optional)</Label>
                <select
                  id="announcement-year"
                  name="year_level"
                  defaultValue={
                    editing?.year_level != null &&
                    editing.year_level >= 1 &&
                    editing.year_level <= 4
                      ? editing.year_level.toString()
                      : ""
                  }
                  className={selectClassName}
                >
                  <option value="">Entire department</option>
                  {[1, 2, 3, 4].map((year) => (
                    <option key={year} value={year}>
                      {formatYearLevel(year)}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={formPending}>Cancel</AlertDialogCancel>
            <Button
              type="submit"
              form={formId}
              name="publish"
              value="0"
              variant="outline"
              disabled={formPending}
            >
              {formPending ? <Loader2 className="animate-spin" /> : null}
              Save draft
            </Button>
            <AlertDialogAction
              type="submit"
              form={formId}
              name="publish"
              value="1"
              disabled={formPending}
            >
              {formPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : editing ? (
                "Save & publish"
              ) : (
                "Publish"
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
