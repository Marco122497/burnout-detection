"use client";

import { useActionState } from "react";

import {
  markNotificationRead,
  type StudentActionState,
} from "@/app/actions/student";
import { useActionToast } from "@/hooks/use-action-toast";
import { formatDateTime } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: StudentActionState = {};

export type StudentNotification = {
  notification_id: number;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
};

export function NotificationsList({
  notifications,
}: {
  notifications: StudentNotification[];
}) {
  const [state, formAction, pending] = useActionState(
    markNotificationRead,
    initialState
  );
  useActionToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your notifications</CardTitle>
        <CardDescription>
          Weekly reminders, submission confirmations, and counseling alerts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          notifications.map((item) => (
            <div
              key={item.notification_id}
              className="rounded-lg border p-4 space-y-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{item.title}</p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {item.notification_type}
                </span>
                {!item.is_read ? (
                  <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
                    Unread
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {item.message}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(item.created_at)}
                </p>
                {!item.is_read ? (
                  <form action={formAction}>
                    <input
                      type="hidden"
                      name="notification_id"
                      value={item.notification_id}
                    />
                    <Button type="submit" size="sm" variant="outline" disabled={pending}>
                      Mark as read
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
