"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useState,
} from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const initialState: GuidanceActionState = {};

export type GenerateMonitoringStudent = {
  id: string;
  full_name: string;
  student_number: string | null;
  week_number: number | null;
};

export function GenerateMonitoringButton({
  departmentId,
  departmentLabel,
  currentWeek,
  monitoringOpen,
  students,
}: {
  departmentId: string;
  departmentLabel: string;
  currentWeek: number;
  monitoringOpen: boolean;
  students: GenerateMonitoringStudent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [skipExisting, setSkipExisting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

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

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(students.map((student) => student.id)));
    }
  }, [open, students]);

  const selectedStudents = useMemo(
    () => students.filter((student) => selectedIds.has(student.id)),
    [students, selectedIds]
  );

  const allSelected =
    students.length > 0 &&
    students.every((student) => selectedIds.has(student.id));
  const someSelected = students.some((student) => selectedIds.has(student.id));

  function toggleStudent(studentId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(studentId);
      } else {
        next.delete(studentId);
      }
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(students.map((student) => student.id)));
      return;
    }
    setSelectedIds(new Set());
  }

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
        disabled={generatePending || students.length === 0}
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
        <AlertDialogContent className="max-h-[90vh] gap-3 overflow-y-auto data-[size=default]:max-w-2xl data-[size=default]:sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <SparklesIcon />
              </AlertDialogMedia>
              <AlertDialogTitle>Auto-fill weekly monitoring</AlertDialogTitle>
              <AlertDialogDescription>
                Randomly answer the weekly monitoring questionnaire for selected
                students in{" "}
                <span className="font-medium text-foreground">
                  {departmentLabel}
                </span>{" "}
                — week {currentWeek}
                {monitoringOpen ? " (open week)" : ""}. Risk levels are balanced
                evenly across Low, Moderate, and High. Submission dates are
                randomized within the last 7 days of the open week and never
                after the current date and time. This uses the same PSS,
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
            <input
              type="hidden"
              name="student_ids"
              value={JSON.stringify(selectedStudents.map((student) => student.id))}
              readOnly
            />

            {students.length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium">
                  Select students — {selectedStudents.length} of {students.length}{" "}
                  chosen
                </p>
                <div className="max-h-56 overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            aria-label="Select all students"
                            checked={allSelected}
                            ref={(element) => {
                              if (element) {
                                element.indeterminate =
                                  someSelected && !allSelected;
                              }
                            }}
                            disabled={generatePending || students.length === 0}
                            onChange={(event) =>
                              toggleSelectAll(event.target.checked)
                            }
                          />
                        </TableHead>
                        <TableHead>Student no.</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => {
                        const submittedThisWeek =
                          student.week_number === currentWeek;
                        return (
                          <TableRow key={student.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                aria-label={`Select ${student.full_name}`}
                                checked={selectedIds.has(student.id)}
                                disabled={generatePending}
                                onChange={(event) =>
                                  toggleStudent(
                                    student.id,
                                    event.target.checked
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {student.student_number || "—"}
                            </TableCell>
                            <TableCell className="max-w-[14rem] truncate">
                              {student.full_name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {submittedThisWeek
                                ? `Week ${currentWeek} submitted`
                                : "No submission this week"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}

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
              <p className="mt-3 text-sm text-destructive">
                {generateState.error}
              </p>
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
                disabled={
                  generatePending ||
                  students.length === 0 ||
                  selectedStudents.length === 0
                }
              >
                {generatePending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Filling…
                  </>
                ) : (
                  `Fill ${selectedStudents.length} student${selectedStudents.length === 1 ? "" : "s"}`
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
