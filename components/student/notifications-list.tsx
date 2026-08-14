"use client";

import { useEffect } from "react";

import { TablePagination } from "@/components/shared/table-pagination";
import {
  Card,
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

export function NotificationsList({
  notifications,
  title = "Your notifications",
  description = "Weekly reminders, submission confirmations, and counseling alerts.",
}: {
  notifications: StudentNotification[];
  title?: string;
  description?: string;
}) {
  const {
    page,
    pageSize,
    totalItems,
    pageItems,
    setPage,
    setPageSize,
  } = useTablePagination(notifications, 10);

  useEffect(() => {
    setPage(1);
  }, [notifications, setPage]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((item) => (
                    <TableRow
                      key={item.notification_id}
                      className={cn(!item.is_read && "bg-primary/5")}
                    >
                      <TableCell className="max-w-[12rem] font-medium">
                        <span className="line-clamp-2">{item.title}</span>
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
                    </TableRow>
                  ))}
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
