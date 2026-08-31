"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SparklesIcon, Loader2 } from "lucide-react";

import {
  generateDepartmentMonitoring,
  type GuidanceActionState,
} from "@/app/actions/guidance";
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

const initialState: GuidanceActionState = {};

export function GenerateMonitoringButton({
  departmentId,
  departmentLabel,
  currentWeek,
  monitoringOpen,
  studentCount,
}: {
  departmentId: string;
  departmentLabel: string;
  currentWeek: number;
  monitoringOpen: boolean;
  studentCount: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [skipExisting, setSkipExisting] = useState(false);

  const [generateState, generateAction, generatePending] = useActionState(
    generateDepartmentMonitoring,
    initialState
  );

  useActionToast(generateState);

  useEffect(() => {
    if (generateState.success) {
      setOpen(false);
      router.refresh();
    }
  }, [generateState.success, router]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      generateAction(formData);
    });
  }

  if (!departmentId) return null;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        disabled={generatePending || studentCount === 0}
      >
        {generatePending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Filling week {currentWeek}…
          </>
        ) : (
          <>
            <SparklesIcon className="size-4" />
            Fill week {currentWeek} for all
          </>
        )}
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!generatePending) setOpen(nextOpen);
        }}
      >
        <AlertDialogContent className="data-[size=default]:max-w-md data-[size=default]:sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <SparklesIcon />
              </AlertDialogMedia>
              <AlertDialogTitle>Auto-fill weekly monitoring</AlertDialogTitle>
              <AlertDialogDescription>
                Randomly answer the weekly monitoring questionnaire for every
                student in{" "}
                <span className="font-medium text-foreground">
                  {departmentLabel}
                </span>{" "}
                — week {currentWeek}
                {monitoringOpen ? " (open week)" : ""}. Risk levels are balanced
                evenly across Low, Moderate, and High. This uses the same PSS,
                Workload, Study Time, and Sleep questions students fill in, then
                saves scores, MFBI, and predictions.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <input type="hidden" name="department_id" value={departmentId} />
            <input
              type="hidden"
              name="skip_existing"
              value={skipExisting ? "1" : "0"}
            />

            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipExisting}
                disabled={generatePending}
                onChange={(event) => setSkipExisting(event.target.checked)}
              />
              Skip students who already submitted this week
            </label>

            {generateState.error ? (
              <p className="mt-3 text-sm text-destructive">{generateState.error}</p>
            ) : null}
            {generateState.success ? (
              <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
                {generateState.success}
              </p>
            ) : null}

            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel type="button" disabled={generatePending}>
                Cancel
              </AlertDialogCancel>
              <Button
                type="submit"
                disabled={generatePending || studentCount === 0}
              >
                {generatePending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Filling…
                  </>
                ) : (
                  `Fill ${studentCount} student${studentCount === 1 ? "" : "s"}`
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
