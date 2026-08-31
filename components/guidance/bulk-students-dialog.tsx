"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Loader2, UploadIcon } from "lucide-react";

import {
  bulkCreateStudents,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { DEFAULT_INITIAL_PASSWORD_NOTE } from "@/lib/auth/defaults";
import type { Department } from "@/lib/auth/roles";
import {
  parseBulkStudentText,
  type BulkStudentDraft,
} from "@/lib/guidance/bulk-students";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
}) {
  const activeDepartments = departments.filter((dept) => dept.is_active);
  const defaultDepartment = findEnglishStudiesDepartment(activeDepartments);
  const [departmentId, setDepartmentId] = useState(
    defaultDepartment?.department_id.toString() ?? ""
  );
  const [pasteText, setPasteText] = useState("");

  const [bulkState, bulkAction, bulkPending] = useActionState(
    bulkCreateStudents,
    initialState
  );

  useActionToast(bulkState);

  useEffect(() => {
    if (bulkState.success) {
      onOpenChange(false);
      setPasteText("");
    }
  }, [bulkState.success, onOpenChange]);

  useEffect(() => {
    if (open && defaultDepartment && !departmentId) {
      setDepartmentId(defaultDepartment.department_id.toString());
    }
  }, [open, defaultDepartment, departmentId]);

  const drafts = useMemo(
    () => (pasteText.trim() ? parseBulkStudentText(pasteText) : []),
    [pasteText]
  );

  const validCount = drafts.filter((row) => row.errors.length === 0).length;
  const invalidCount = drafts.length - validCount;

  const rowsJson = JSON.stringify(
    drafts.filter((row) => row.errors.length === 0)
  );

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
                <p className="text-sm font-medium">
                  Preview — {validCount} ready
                  {invalidCount > 0 ? `, ${invalidCount} with errors` : ""}
                </p>
                <div className="max-h-56 overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
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
                        <PreviewRow key={`${row.rowNumber}-${row.email}`} row={row} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </form>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={bulkPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="submit"
            form="bulk-students-form"
            disabled={
              bulkPending || validCount === 0 || !departmentId || invalidCount > 0
            }
          >
            {bulkPending ? (
              <>
                <Loader2 className="animate-spin" />
                Importing…
              </>
            ) : (
              `Import ${validCount || ""} student${validCount === 1 ? "" : "s"}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PreviewRow({ row }: { row: BulkStudentDraft }) {
  const fullName = [row.first_name, row.middle_name, row.last_name]
    .filter(Boolean)
    .join(" ");
  const hasErrors = row.errors.length > 0;

  return (
    <TableRow className={hasErrors ? "bg-destructive/5" : undefined}>
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
        {hasErrors ? row.errors.join(" ") : "Ready"}
      </TableCell>
    </TableRow>
  );
}
