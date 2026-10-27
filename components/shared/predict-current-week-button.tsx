"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  predictCurrentWeekMonitoring,
  type MonitoringPredictionState,
} from "@/app/actions/monitoring-predictions";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  AlertDialog,
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

function predictLabel(weeks: number[]) {
  const names = weeks.map((week) => `week ${week}`);
  if (names.length === 0) return "Predict weeks";
  if (names.length === 1) return `Predict ${names[0]}`;
  if (names.length === 2) return `Predict ${names[0]} and ${names[1]}`;
  return `Predict ${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function PredictCurrentWeekButton({
  currentWeek,
  week1Count,
  week2Count,
  week3Count,
}: {
  currentWeek: number;
  week1Count: number;
  week2Count: number;
  week3Count: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [predictWeek1, setPredictWeek1] = useState(true);
  const [predictWeek2, setPredictWeek2] = useState(true);
  const [predictWeek3, setPredictWeek3] = useState(true);
  const [state, setState] = useState<MonitoringPredictionState>(initialState);
  const [pending, setPending] = useState(false);

  useActionToast(state);

  const selectedWeeks = [
    predictWeek1 ? { week: 1, count: week1Count } : null,
    predictWeek2 ? { week: 2, count: week2Count } : null,
    predictWeek3 ? { week: 3, count: week3Count } : null,
  ].filter((week): week is { week: number; count: number } => week != null);
  const canRun = selectedWeeks.some((week) => week.count > 0);
  const label = predictLabel(selectedWeeks.map((week) => week.week));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setState(initialState);
    setPending(true);
    try {
      const result = await predictCurrentWeekMonitoring(initialState, formData);
      setState(result ?? {});
      if (result?.success) {
        setOpen(false);
        router.refresh();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to fetch";
      setState({
        error:
          message === "Failed to fetch" || message === "fetch failed"
            ? "Prediction timed out or lost connection. The AI service may be offline. Try again when it is up."
            : message,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={(week1Count === 0 && week2Count === 0 && week3Count === 0) || pending}
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
              Choose Week 1, Week 2, Week 3, or a combination. Each run uses
              that week’s submitted scores
              {currentWeek >= 1 && currentWeek <= 3
                ? ` (Week ${currentWeek} is open now)`
                : ""}
              . Records that already have a forecast for that week are skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={handleSubmit} id="predict-current-week" className="space-y-2">
            <input
              type="hidden"
              name="predict_week_1"
              value={predictWeek1 ? "1" : "0"}
            />
            <input
              type="hidden"
              name="predict_week_2"
              value={predictWeek2 ? "1" : "0"}
            />
            <input
              type="hidden"
              name="predict_week_3"
              value={predictWeek3 ? "1" : "0"}
            />
            {(
              [
                { week: 1, checked: predictWeek1, setChecked: setPredictWeek1, count: week1Count },
                { week: 2, checked: predictWeek2, setChecked: setPredictWeek2, count: week2Count },
                { week: 3, checked: predictWeek3, setChecked: setPredictWeek3, count: week3Count },
              ] as const
            ).map((item) => (
              <label
                key={item.week}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    disabled={pending}
                    onChange={(event) => item.setChecked(event.target.checked)}
                  />
                  Week {item.week}
                  {currentWeek === item.week ? " (open now)" : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.count.toLocaleString()} submitted
                </span>
              </label>
            ))}
            {state.error ? (
              <p className="text-sm text-destructive">{state.error}</p>
            ) : null}
          </form>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <Button
              type="submit"
              form="predict-current-week"
              disabled={pending || !canRun}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Predicting…
                </>
              ) : (
                "Run predictions"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
