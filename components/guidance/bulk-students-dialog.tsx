"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Loader2, Trash2Icon, UploadIcon } from "lucide-react";

import {
  bulkCreateStudents,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { DEFAULT_INITIAL_PASSWORD_NOTE } from "@/lib/auth/defaults";
import type { Department } from "@/lib/auth/roles";
import {
  enrichBulkDrafts,
  getImportableBulkDrafts,
  isSkippableBulkConflict,
  parseBulkStudentText,
  type BulkStudentDraft,
} from "@/lib/guidance/bulk-students";
import { useActionToast } from "@/hooks/use-action-toast";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatYearLevel } from "@/lib/utils";

const initialState: GuidanceActionState = {};

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const textareaClassName =
  "flex min-h-[140px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 font-mono text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function findEnglishStudiesDepartment(departments: Department[]) {
  return (
    departments.find((dept) =>
      /english language studies/i.test(dept.department_name)
    ) ??
    departments.find((dept) =>
      /english language studies/i.test(dept.description ?? "")
    ) ??
    null
  );
}

export function BulkStudentsDialog({
  open,
  onOpenChange,
  departments,
  existingEmails = [],
  existingStudentNumbers = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  existingEmails?: string[];
  existingStudentNumbers?: string[];
}) {
  const activeDepartments = departments.filter((dept) => dept.is_active);
  const defaultDepartment = findEnglishStudiesDepartment(activeDepartments);
  const [departmentId, setDepartmentId] = useState(
    defaultDepartment?.department_id.toString() ?? ""
  );
  const [pasteText, setPasteText] = useState("");
  const [removedRowNumbers, setRemovedRowNumbers] = useState<Set<number>>(
    () => new Set()
  );
  const [selectedRowNumbers, setSelectedRowNumbers] = useState<Set<number>>(
    () => new Set()
  );
  const [skipExisting, setSkipExisting] = useState(true);

  const [bulkState, bulkAction, bulkPending] = useActionState(
    bulkCreateStudents,
    initialState
  );

  useActionToast(bulkState);

  useEffect(() => {
    if (bulkState.success) {
      onOpenChange(false);
      setPasteText("");
      setRemovedRowNumbers(new Set());
      setSelectedRowNumbers(new Set());
    }
  }, [bulkState.success, onOpenChange]);

  useEffect(() => {
    if (open && defaultDepartment && !departmentId) {
      setDepartmentId(defaultDepartment.department_id.toString());
    }
  }, [open, defaultDepartment, departmentId]);

  const drafts = useMemo(() => {
    if (!pasteText.trim()) return [];
    const parsed = parseBulkStudentText(pasteText);
    const enriched = enrichBulkDrafts(parsed, {
      existingEmails,
      existingStudentNumbers,
    });
    return enriched.filter((row) => !removedRowNumbers.has(row.rowNumber));
  }, [pasteText, removedRowNumbers, existingEmails, existingStudentNumbers]);

  useEffect(() => {
    setRemovedRowNumbers(new Set());
    setSelectedRowNumbers(new Set());
  }, [pasteText]);

  const importableDrafts = useMemo(
    () => getImportableBulkDrafts(drafts, skipExisting),
    [drafts, skipExisting]
  );
  const importCount = importableDrafts.length;
  const skippedCount = drafts.filter(
    (row) =>
      row.errors.length > 0 &&
      row.errors.every((error) => isSkippableBulkConflict(error))
  ).length;
  const invalidCount = drafts.filter((row) => {
    const blockingErrors = skipExisting
      ? row.errors.filter((error) => !isSkippableBulkConflict(error))
      : row.errors;
    return blockingErrors.length > 0;
  }).length;

  const selectableRowNumbers = importableDrafts.map((row) => row.rowNumber);
  const allSelectableSelected =
    selectableRowNumbers.length > 0 &&
    selectableRowNumbers.every((rowNumber) =>
      selectedRowNumbers.has(rowNumber)
    );
  const someSelectableSelected = selectableRowNumbers.some((rowNumber) =>
    selectedRowNumbers.has(rowNumber)
  );

  const rowsJson = JSON.stringify(importableDrafts);

  function toggleRowSelection(rowNumber: number, checked: boolean) {
    setSelectedRowNumbers((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(rowNumber);
      } else {
        next.delete(rowNumber);
      }
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedRowNumbers(new Set(selectableRowNumbers));
      return;
    }
    setSelectedRowNumbers(new Set());
  }

  function removeSelectedRows() {
    if (selectedRowNumbers.size === 0) return;
    setRemovedRowNumbers((current) => {
      const next = new Set(current);
      for (const rowNumber of selectedRowNumbers) {
        next.add(rowNumber);
      }
      return next;
    });
    setSelectedRowNumbers(new Set());
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90vh] gap-3 overflow-y-auto data-[size=default]:max-w-3xl data-[size=default]:sm:max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <UploadIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Bulk add students</AlertDialogTitle>
          <AlertDialogDescription>
            Paste rows copied from Excel or Google Sheets (include the header
            row). All students will be assigned to the selected course.{" "}
            {DEFAULT_INITIAL_PASSWORD_NOTE}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {open ? (
          <form
            id="bulk-students-form"
            action={bulkAction}
            className="space-y-4"
          >
            <input type="hidden" name="rows_json" value={rowsJson} readOnly />
            <input
              type="hidden"
              name="skip_existing"
              value={skipExisting ? "1" : "0"}
              readOnly
            />
            <div className="space-y-1.5">
              <Label htmlFor="bulk-department_id">Course</Label>
              <select
                id="bulk-department_id"
                name="department_id"
                required
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                className={selectClassName}
              >
                <option value="" disabled>
                  Select course
                </option>
                {activeDepartments.map((dept) => (
                  <option key={dept.department_id} value={dept.department_id}>
                    {dept.department_code} — {dept.department_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-paste">Paste student rows</Label>
              <textarea
                id="bulk-paste"
                value={pasteText}
                onChange={(event) => setPasteText(event.target.value)}
                placeholder={
                  "Student No.\tStudent\tEmail\tAcademic Level\tSection\tProgram\n" +
                  "224720\tLongcob, Cressyl Jane Navasca\tcressyllongcob@ckcm.edu.ph\t4th Year\t\tBachelor of Arts in English Language Studies"
                }
                className={textareaClassName}
              />
              <p className="text-xs text-muted-foreground">
                Expected columns: Student No., Student, Email, Academic Level,
                Section (optional), Program (optional).
              </p>
            </div>

            {drafts.length > 0 ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    Preview — {importCount} to import
                    {skippedCount > 0 ? `, ${skippedCount} already registered` : ""}
                    {invalidCount > 0 ? `, ${invalidCount} with errors` : ""}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={selectedRowNumbers.size === 0}
                    onClick={removeSelectedRows}
                  >
                    <Trash2Icon className="size-4" />
                    Remove selected ({selectedRowNumbers.size})
                  </Button>
                </div>
                <div className="max-h-56 overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            aria-label="Select all valid rows"
                            checked={allSelectableSelected}
                            ref={(element) => {
                              if (element) {
                                element.indeterminate =
                                  someSelectableSelected &&
                                  !allSelectableSelected;
                              }
                            }}
                            disabled={selectableRowNumbers.length === 0}
                            onChange={(event) =>
                              toggleSelectAll(event.target.checked)
                            }
                          />
                        </TableHead>
                        <TableHead>Row</TableHead>
                        <TableHead>Student no.</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drafts.map((row) => (
                        <PreviewRow
                          key={`${row.rowNumber}-${row.email}`}
                          row={row}
                          skipExisting={skipExisting}
                          selected={selectedRowNumbers.has(row.rowNumber)}
                          onSelectChange={(checked) =>
                            toggleRowSelection(row.rowNumber, checked)
                          }
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}

            {drafts.length > 0 ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={skipExisting}
                  disabled={bulkPending}
                  onChange={(event) => setSkipExisting(event.target.checked)}
                />
                Skip students whose email or student number is already registered
              </label>
            ) : null}

            {bulkState.error ? (
              <p className="text-sm text-destructive">{bulkState.error}</p>
            ) : null}
            {bulkState.success ? (
              <p className="text-sm text-green-600 dark:text-green-400">
                {bulkState.success}
              </p>
            ) : null}
          </form>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={bulkPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="submit"
            form="bulk-students-form"
            disabled={
              bulkPending ||
              importCount === 0 ||
              !departmentId ||
              invalidCount > 0
            }
          >
            {bulkPending ? (
              <>
                <Loader2 className="animate-spin" />
                Importing…
              </>
            ) : (
              `Import ${importCount || ""} student${importCount === 1 ? "" : "s"}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PreviewRow({
  row,
  skipExisting,
  selected,
  onSelectChange,
}: {
  row: BulkStudentDraft;
  skipExisting: boolean;
  selected: boolean;
  onSelectChange: (checked: boolean) => void;
}) {
  const fullName = [row.first_name, row.middle_name, row.last_name]
    .filter(Boolean)
    .join(" ");
  const blockingErrors = skipExisting
    ? row.errors.filter((error) => !isSkippableBulkConflict(error))
    : row.errors;
  const skippableOnly =
    row.errors.length > 0 &&
    blockingErrors.length === 0 &&
    row.errors.every((error) => isSkippableBulkConflict(error));
  const hasErrors = blockingErrors.length > 0;

  return (
    <TableRow
      className={
        hasErrors
          ? "bg-destructive/5"
          : skippableOnly
            ? "bg-muted/40"
            : undefined
      }
    >
      <TableCell>
        <input
          type="checkbox"
          aria-label={`Select row ${row.rowNumber}`}
          checked={selected}
          disabled={hasErrors}
          onChange={(event) => onSelectChange(event.target.checked)}
        />
      </TableCell>
      <TableCell>{row.rowNumber}</TableCell>
      <TableCell>{row.student_number || "—"}</TableCell>
      <TableCell className="max-w-[10rem] truncate">{fullName || "—"}</TableCell>
      <TableCell className="max-w-[12rem] truncate">{row.email || "—"}</TableCell>
      <TableCell>
        {Number.isNaN(row.year_level)
          ? "—"
          : formatYearLevel(row.year_level)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {hasErrors
          ? blockingErrors.join(" ")
          : skippableOnly
            ? skipExisting
              ? "Already registered (will skip)"
              : row.errors.join(" ")
            : "Ready"}
      </TableCell>
    </TableRow>
  );
}
