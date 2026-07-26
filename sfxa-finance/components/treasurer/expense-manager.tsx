"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { ExternalLinkIcon, Loader2, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  createExpense,
  deleteExpense,
  updateExpense,
  type FinanceActionState,
} from "@/app/actions/finance";
import { formatDate, formatMoney } from "@/lib/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const initialState: FinanceActionState = {};

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type ExpenseCategory = {
  expense_category_id: number;
  category_name: string;
};

export type ExpenseRow = {
  expense_id: number;
  expense_category_id: number | null;
  description: string | null;
  amount: number | string;
  expense_date: string;
  receipt_url: string | null;
  category_name: string | null;
};

function ExpenseFormFields({
  categories,
  defaults,
  idPrefix,
}: {
  categories: ExpenseCategory[];
  defaults?: Partial<ExpenseRow>;
  idPrefix: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-category`}>Category</Label>
        <select
          id={`${idPrefix}-category`}
          name="expense_category_id"
          required
          defaultValue={
            defaults?.expense_category_id ??
            categories[0]?.expense_category_id ??
            ""
          }
          className={selectClassName}
        >
          {categories.map((category) => (
            <option
              key={category.expense_category_id}
              value={category.expense_category_id}
            >
              {category.category_name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-amount`}>Amount</Label>
        <Input
          id={`${idPrefix}-amount`}
          name="amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          defaultValue={defaults?.amount ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-date`}>Date</Label>
        <Input
          id={`${idPrefix}-date`}
          name="expense_date"
          type="date"
          required
          defaultValue={defaults?.expense_date ?? today}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-receipt`}>Receipt</Label>
        <Input
          id={`${idPrefix}-receipt`}
          name="receipt"
          type="file"
          accept="image/*,application/pdf"
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-description`}>Description</Label>
        <Input
          id={`${idPrefix}-description`}
          name="description"
          defaultValue={defaults?.description ?? ""}
        />
      </div>
    </div>
  );
}

function AddExpenseDialog({ categories }: { categories: ExpenseCategory[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createExpense,
    initialState
  );

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button type="button" />}>
        <PlusIcon />
        Add expense
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Add expense</AlertDialogTitle>
          <AlertDialogDescription>
            Record a parish expense and optionally upload a receipt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          action={formAction}
          id="add-expense-form"
          className="space-y-4"
        >
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <ExpenseFormFields categories={categories} idPrefix="add" />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button type="submit" form="add-expense-form" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EditExpenseDialog({
  row,
  categories,
}: {
  row: ExpenseRow;
  categories: ExpenseCategory[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateExpense,
    initialState
  );

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Edit expense"
          />
        }
      >
        <PencilIcon />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Edit expense</AlertDialogTitle>
          <AlertDialogDescription>
            Update expense details or replace the receipt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          action={formAction}
          id={`edit-expense-${row.expense_id}`}
          className="space-y-4"
        >
          <input type="hidden" name="expense_id" value={row.expense_id} />
          <input
            type="hidden"
            name="existing_receipt_url"
            value={row.receipt_url ?? ""}
          />
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <ExpenseFormFields
            categories={categories}
            idPrefix={`edit-${row.expense_id}`}
            defaults={row}
          />
          {row.receipt_url && (
            <p className="text-xs text-muted-foreground">
              Current receipt stays unless you upload a new file.
            </p>
          )}
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            type="submit"
            form={`edit-expense-${row.expense_id}`}
            disabled={pending}
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteExpenseButton({ expenseId }: { expenseId: number }) {
  const [state, formAction, pending] = useActionState(
    deleteExpense,
    initialState
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="expense_id" value={expenseId} />
      {state.error && (
        <span className="sr-only" role="alert">
          {state.error}
        </span>
      )}
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        disabled={pending}
        aria-label="Delete expense"
      >
        {pending ? <Loader2 className="animate-spin" /> : <Trash2Icon />}
      </Button>
    </form>
  );
}

export function ExpenseManager({
  expenses,
  categories,
}: {
  expenses: ExpenseRow[];
  categories: ExpenseCategory[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((row) => {
      const haystack = [
        row.description,
        row.category_name,
        String(row.amount),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [expenses, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Expenses</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} record{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search expenses…"
            className="w-[220px]"
          />
          <AddExpenseDialog categories={categories} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No expenses yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Receipt</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.expense_id}>
                <TableCell>{formatDate(row.expense_date)}</TableCell>
                <TableCell>{row.category_name || "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {row.description || "—"}
                </TableCell>
                <TableCell>
                  {row.receipt_url ? (
                    <a
                      href={row.receipt_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      View
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(row.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <EditExpenseDialog row={row} categories={categories} />
                    <DeleteExpenseButton expenseId={row.expense_id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
