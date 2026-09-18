"use client";

import { useActionState, useEffect, useState } from "react";
import { CalendarClockIcon, Loader2 } from "lucide-react";

import {
  closeMonitoringWindow,
  openNextMonitoringWeek,
  resetMonitoringToWeek1,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { useActionToast } from "@/hooks/use-action-toast";
import type { AcademicTerm } from "@/lib/student/terms";
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

const initialState: GuidanceActionState = {};

export function MonitoringWeekControls({
  term,
}: {
  term: AcademicTerm | null;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openConfirmOpen, setOpenConfirmOpen] = useState(false);
  const [openState, openAction, openPending] = useActionState(
    openNextMonitoringWeek,
    initialState
  );
  const [closeState, closeAction, closePending] = useActionState(
    closeMonitoringWindow,
    initialState
  );
  const [resetState, resetAction, resetPending] = useActionState(
    resetMonitoringToWeek1,
    initialState
  );

  useActionToast(openState);
  useActionToast(closeState);
  useActionToast(resetState);

  useEffect(() => {
    if (openState.success || openState.error) {
      setOpenConfirmOpen(false);
    }
  }, [openState.success, openState.error]);

  const week = term?.monitoring_week ?? 1;
  const enabled = Boolean(term?.monitoring_enabled);
  const nextWeek = week + 1;
  const pending = openPending || closePending || resetPending;
  const alreadyWeek1Open = week === 1 && enabled;

  const statusLabel = term
    ? enabled
      ? `Week ${week} · Open`
      : `Week ${week} · Closed`
    : "No active term";

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={() => setDialogOpen(true)}
      >
        <CalendarClockIcon className="size-4" />
        <span className="hidden sm:inline">Weekly monitoring</span>
        <span className="text-muted-foreground">{statusLabel}</span>
      </Button>

      <AlertDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          if (pending || openConfirmOpen) return;
          setDialogOpen(next);
        }}
      >
        <AlertDialogContent className="data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <CalendarClockIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Weekly monitoring control</AlertDialogTitle>
            <AlertDialogDescription>
              Open the next monitoring week for students. Week {week} is treated
              as the previous week; opening advances to Week {nextWeek}.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {term ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <p>
                  Active term:{" "}
                  <span className="font-medium text-foreground">
                    {term.academic_year} · {term.semester}
                  </span>
                </p>
                <p className="mt-1">
                  {enabled ? (
                    <>
                      Open for students:{" "}
                      <span className="font-medium text-foreground">
                        Week {week}
                      </span>
                    </>
                  ) : (
                    <>
                      Previous week:{" "}
                      <span className="font-medium text-foreground">
                        Week {week}
                      </span>
                    </>
                  )}
                  {" · "}
                  Status:{" "}
                  <span className="font-medium text-foreground">
                    {enabled ? "Open for students" : "Closed"}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={pending}
                  onClick={() => setOpenConfirmOpen(true)}
                >
                  {openPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Opening…
                    </>
                  ) : (
                    `Open Week ${nextWeek}`
                  )}
                </Button>
                <form action={closeAction}>
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={pending || !enabled}
                  >
                    {closePending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Closing…
                      </>
                    ) : (
                      "Close monitoring window"
                    )}
                  </Button>
                </form>
                <form action={resetAction}>
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={pending || alreadyWeek1Open}
                  >
                    {resetPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Resetting…
                      </>
                    ) : (
                      "Reset to Week 1"
                    )}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active academic term configured. Add one before opening weekly
              monitoring.
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={openConfirmOpen}
        onOpenChange={(next) => {
          if (openPending) return;
          setOpenConfirmOpen(next);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <CalendarClockIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Open Week {nextWeek}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will close Week {week} as the previous week and open Week{" "}
              {nextWeek} for student submissions. Students who have not
              submitted Week {week} will no longer be able to submit that week.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form action={openAction} id="open-next-monitoring-week" />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={openPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="open-next-monitoring-week"
              disabled={openPending}
            >
              {openPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Opening…
                </>
              ) : (
                `Yes, open Week ${nextWeek}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
