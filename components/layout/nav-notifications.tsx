"use client";

import { useEffect, useState, useTransition } from "react";
import { BellIcon, CheckCheckIcon, Loader2 } from "lucide-react";

import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/student";
import { useNavigationPending } from "@/components/layout/navigation-pending";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/auth/roles";

export type NavNotification = {
  id: number;
  title: string;
  content: string;
  date: string;
  type?: string | null;
  isRead?: boolean;
};

export function NavNotifications({
  notifications,
  viewAllHref,
}: {
  notifications: NavNotification[];
  viewAllHref?: string | null;
}) {
  const { navigate, isPending, pendingHref } = useNavigationPending();
  const [items, setItems] = useState(notifications);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [markPending, startMarkTransition] = useTransition();
  const [markAllPending, startMarkAllTransition] = useTransition();

  useEffect(() => {
    setItems(notifications);
  }, [notifications]);

  const visibleItems = items.filter((item) => !item.isRead);
  const unreadCount = visibleItems.length;
  const showBadge = unreadCount > 0;

  function markAsRead(id: number) {
    setPendingId(id);
    startMarkTransition(async () => {
      const formData = new FormData();
      formData.set("notification_id", String(id));
      const result = await markNotificationRead({}, formData);
      if (!result.error) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, isRead: true } : item
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
        setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="relative" />
        }
      >
        <BellIcon className="size-4" />
        {showBadge ? (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
        <span className="sr-only">Notifications</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="flex w-72 min-w-72 flex-col overflow-hidden p-1 sm:w-80 sm:min-w-80"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-sm font-medium">Notifications</span>
              <div className="flex items-center gap-1">
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
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          markAllAsRead();
                        }}
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
                  {unreadCount > 0
                    ? `${unreadCount} unread`
                    : "All caught up"}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {visibleItems.length === 0 ? (
          <div className="px-2 py-8 text-center text-sm text-muted-foreground">
            No new notifications.
          </div>
        ) : (
          <div className="min-h-0 max-h-[min(22rem,55vh)] overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [scrollbar-width:thin]">
            {visibleItems.map((item, index) => {
              const isMarking = markPending && pendingId === item.id;
              return (
                <div key={item.id}>
                  {index > 0 ? <DropdownMenuSeparator /> : null}
                  <button
                    type="button"
                    disabled={isMarking}
                    title="Mark as read"
                    aria-label={`Mark "${item.title}" as read`}
                    className="flex w-full items-start gap-1 bg-primary/5 px-2 py-2.5 text-left transition-colors hover:bg-primary/10 disabled:opacity-70"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      markAsRead(item.id);
                    }}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      {item.type === "Announcement" ? (
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Announcement
                        </p>
                      ) : null}
                      <p className="break-words text-sm font-medium leading-snug">
                        {item.title}
                      </p>
                      <p className="line-clamp-2 break-words text-xs text-muted-foreground">
                        {item.content}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTime(item.date)}
                      </p>
                    </div>
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center text-muted-foreground">
                      {isMarking ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCheckIcon className="size-4" />
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {viewAllHref ? (
          <>
            <DropdownMenuSeparator />
            <div className="p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-center"
                disabled={isPending && pendingHref === viewAllHref}
                onClick={() => navigate(viewAllHref)}
              >
                View all notifications
              </Button>
            </div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
