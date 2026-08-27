"use client";

import { useActionState } from "react";
import { CalendarClockIcon, Loader2 } from "lucide-react";

import {
  closeMonitoringWindow,
  openNextMonitoringWeek,
  resetMonitoringToWeek1,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { useActionToast } from "@/hooks/use-action-toast";
import type { AcademicTerm } from "@/lib/student/terms";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: GuidanceActionState = {};

export function MonitoringWeekControls({
  term,
}: {
  term: AcademicTerm | null;
}) {
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

  const week = term?.monitoring_week ?? 1;
  const enabled = Boolean(term?.monitoring_enabled);
  const nextWeek = week + 1;
  const pending = openPending || closePending || resetPending;
  const alreadyWeek1Open = week === 1 && enabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarClockIcon className="size-4" />
          Weekly monitoring control
        </CardTitle>
        <CardDescription>
          Open the next monitoring week for students. Week {week} is treated as
          the previous week; opening advances to Week {nextWeek}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {term ? (
          <>
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
              <form action={openAction}>
                <Button type="submit" disabled={pending}>
                  {openPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Opening…
                    </>
                  ) : (
                    `Open Week ${nextWeek}`
                  )}
                </Button>
              </form>
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
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No active academic term configured. Add one before opening weekly
            monitoring.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
