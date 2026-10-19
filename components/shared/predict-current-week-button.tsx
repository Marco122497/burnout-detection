"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  predictCurrentWeekMonitoring,
  type MonitoringPredictionState,
} from "@/app/actions/monitoring-predictions";
import { useActionToast } from "@/hooks/use-action-toast";
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

const initialState: MonitoringPredictionState = {};

export function PredictCurrentWeekButton({
  currentWeek,
  submittedCount,
}: {
  currentWeek: number;
  submittedCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    predictCurrentWeekMonitoring,
    initialState
  );

  useActionToast(state, pending);

  useEffect(() => {
    if (!state.success) return;
    setOpen(false);
    router.refresh();
  }, [state.success, router]);

  const label = `Predict week ${currentWeek}`;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={submittedCount === 0 || pending}
        onClick={() => setOpen(true)}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Sparkles className="size-4" />
        )}
        {pending ? "Predicting…" : label}
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Sparkles />
            </AlertDialogMedia>
            <AlertDialogTitle>{label}?</AlertDialogTitle>
            <AlertDialogDescription>
              This runs the next-week prediction for{" "}
              {submittedCount === 1
                ? "the 1 student who submitted"
                : `all ${submittedCount} students who submitted`}{" "}
              week {currentWeek}. Records that already have a forecast are
              skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form action={action} id="predict-current-week" />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="predict-current-week"
              disabled={pending || submittedCount === 0}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Predicting…
                </>
              ) : (
                "Run predictions"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
