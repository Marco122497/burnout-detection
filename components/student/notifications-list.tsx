"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCheckIcon, Loader2 } from "lucide-react";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/actions/student";
import { TablePagination } from "@/components/shared/table-pagination";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useTablePagination } from "@/hooks/use-table-pagination";
import { formatDateTime } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

export type StudentNotification = {
  notification_id: number;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
};

/** High-priority alerts (e.g. High Sleep Hours) stay above newer normal items. */
function sortNotifications(items: StudentNotification[]) {
  return [...items].sort((a, b) => {
    const aHigh = a.priority === "High" ? 0 : 1;
    const bHigh = b.priority === "High" ? 0 : 1;
    if (aHigh !== bHigh) return aHigh - bHigh;
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  });
}

export function NotificationsList({
  notifications,
  title = "Your notifications",
  description = "Weekly reminders, announcements, submission confirmations, and counseling alerts.",
}: {
  notifications: StudentNotification[];
  title?: string;
  description?: string;
}) {
  const [items, setItems] = useState(() => sortNotifications(notifications));
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [markPending, startMarkTransition] = useTransition();
  const [markAllPending, startMarkAllTransition] = useTransition();

  useEffect(() => {
    setItems(sortNotifications(notifications));
  }, [notifications]);

  const {
    page,
    pageSize,
    totalItems,
    pageItems,
    setPage,
    setPageSize,
  } = useTablePagination(items, 10);

  useEffect(() => {
    setPage(1);
  }, [items, setPage]);

  const unreadCount = items.filter(
    (item) => !item.is_read && item.notification_id > 0
  ).length;

  function markAsRead(id: number) {
    if (id <= 0 || markPending || markAllPending) return;
    setPendingId(id);
    startMarkTransition(async () => {
      const formData = new FormData();
      formData.set("notification_id", String(id));
      const result = await markNotificationRead({}, formData);
      if (!result.error) {
        setItems((prev) =>
          prev.map((item) =>
            item.notification_id === id ? { ...item, is_read: true } : item
          )
        );
      }
      setPendingId(null);
    });
  }

  function markAllAsRead() {
    if (unreadCount === 0 || markAllPending) return;
    startMarkAllTransition(async () => {
      const result = await markAllNotificationsRead({});
      if (!result.error) {
        setItems((prev) =>
          prev.map((item) =>
            item.notification_id > 0 ? { ...item, is_read: true } : item
          )
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-7"
                    aria-label="Mark all as read"
                    disabled={
                      unreadCount === 0 || markAllPending || markPending
                    }
                    onClick={markAllAsRead}
                  >
                    {markAllPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCheckIcon className="size-4" />
                    )}
                  </Button>
                }
              />
              <TooltipContent>Mark all as read</TooltipContent>
            </Tooltip>
            <span className="min-w-[4.5rem] text-right text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </span>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-12 text-right">
                      <span className="sr-only">Mark read</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((item) => {
                    const canMark =
                      !item.is_read && item.notification_id > 0;
                    const isMarking =
                      markPending && pendingId === item.notification_id;

                    return (
                      <TableRow
                        key={item.notification_id}
                        className={cn(
                          !item.is_read && "bg-primary/5",
                          canMark &&
                            "cursor-pointer transition-colors hover:bg-primary/10"
                        )}
                        onClick={() => {
                          if (canMark) markAsRead(item.notification_id);
                        }}
                      >
                        <TableCell className="max-w-[12rem] font-medium">
                          <span className="line-clamp-2">{item.title}</span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {item.notification_type}
                        </TableCell>
                        <TableCell className="max-w-[18rem] text-muted-foreground">
                          <span className="line-clamp-2 whitespace-pre-line">
                            {item.message}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {item.priority}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              item.is_read
                                ? "text-muted-foreground"
                                : "text-primary"
                            )}
                          >
                            {item.is_read ? "Read" : "Unread"}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {formatDateTime(item.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          {canMark ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="size-7"
                              aria-label={`Mark "${item.title}" as read`}
                              title="Mark as read"
                              disabled={isMarking || markAllPending}
                              onClick={(event) => {
                                event.stopPropagation();
                                markAsRead(item.notification_id);
                              }}
                            >
                              {isMarking ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <CheckCheckIcon className="size-4" />
                              )}
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <TablePagination
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[10]}
              id="notifications-rows"
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
