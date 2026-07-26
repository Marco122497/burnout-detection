"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import {
  createAnnouncement,
  deleteAnnouncement,
  publishAnnouncement,
  updateAnnouncement,
  type AnnouncementActionState,
} from "@/app/actions/announcements";
import { formatDateTime } from "@/lib/auth/roles";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AnnouncementActionState = {};

export type AnnouncementRow = {
  announcement_id: number;
  title: string;
  content: string;
  is_published: boolean | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export function AnnouncementManager({
  announcements,
}: {
  announcements: AnnouncementRow[];
}) {
  const [createState, createAction, createPending] = useActionState(
    createAnnouncement,
    initialState
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Announcement</CardTitle>
          <CardDescription>
            Create a parish announcement. Publish when ready for staff to see.
          </CardDescription>
        </CardHeader>
        <form action={createAction}>
          <CardContent className="space-y-4">
            {createState.error && (
              <Alert variant="destructive">
                <AlertDescription>{createState.error}</AlertDescription>
              </Alert>
            )}
            {createState.success && (
              <Alert>
                <AlertDescription>{createState.success}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <textarea
                id="content"
                name="content"
                required
                rows={4}
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="publish" value="1" className="size-4" />
              Publish immediately
            </label>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={createPending}>
              {createPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving…
                </>
              ) : (
                "Save announcement"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="space-y-4">
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No announcements yet.
            </CardContent>
          </Card>
        ) : (
          announcements.map((item) => (
            <AnnouncementCard key={item.announcement_id} item={item} />
          ))
        )}
      </div>
    </div>
  );
}

function AnnouncementCard({ item }: { item: AnnouncementRow }) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateAnnouncement,
    initialState
  );
  const [publishState, publishAction, publishPending] = useActionState(
    publishAnnouncement,
    initialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteAnnouncement,
    initialState
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{item.title}</CardTitle>
        <CardDescription>
          {item.is_published ? "Published" : "Draft"} · Updated{" "}
          {formatDateTime(item.updated_at)}
          {item.published_at ? ` · Published ${formatDateTime(item.published_at)}` : ""}
        </CardDescription>
      </CardHeader>
      <form action={updateAction}>
        <input type="hidden" name="announcement_id" value={item.announcement_id} />
        <CardContent className="space-y-4">
          {(updateState.error || publishState.error || deleteState.error) && (
            <Alert variant="destructive">
              <AlertDescription>
                {updateState.error || publishState.error || deleteState.error}
              </AlertDescription>
            </Alert>
          )}
          {(updateState.success ||
            publishState.success ||
            deleteState.success) && (
            <Alert>
              <AlertDescription>
                {updateState.success ||
                  publishState.success ||
                  deleteState.success}
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor={`title-${item.announcement_id}`}>Title</Label>
            <Input
              id={`title-${item.announcement_id}`}
              name="title"
              defaultValue={item.title}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`content-${item.announcement_id}`}>Content</Label>
            <textarea
              id={`content-${item.announcement_id}`}
              name="content"
              required
              rows={4}
              defaultValue={item.content}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button type="submit" disabled={updatePending}>
            {updatePending ? <Loader2 className="animate-spin" /> : "Save"}
          </Button>
        </CardFooter>
      </form>
      <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
        <form action={publishAction}>
          <input type="hidden" name="announcement_id" value={item.announcement_id} />
          <input
            type="hidden"
            name="publish"
            value={item.is_published ? "0" : "1"}
          />
          <Button type="submit" variant="outline" disabled={publishPending}>
            {item.is_published ? "Unpublish" : "Publish"}
          </Button>
        </form>
        <form action={deleteAction}>
          <input type="hidden" name="announcement_id" value={item.announcement_id} />
          <Button type="submit" variant="destructive" disabled={deletePending}>
            Delete
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
