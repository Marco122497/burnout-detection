"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Loader2, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  createBudget,
  deleteBudget,
  updateBudget,
  type FinanceActionState,
} from "@/app/actions/finance";
import { formatMoney, toNumber } from "@/lib/format";
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

export type BudgetCategory = {
  budget_category_id: number;
  category_name: string;
};

export type BudgetRow = {
  budget_id: number;
  budget_category_id: number | null;
  fiscal_year: number;
  allocated_amount: number | string;
  remarks: string | null;
  category_name: string | null;
  spent: number;
};

function BudgetFormFields({
  categories,
  defaults,
  idPrefix,
}: {
  categories: BudgetCategory[];
  defaults?: Partial<BudgetRow>;
  idPrefix: string;
}) {
  const year = new Date().getFullYear();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-category`}>Category</Label>
        <select
          id={`${idPrefix}-category`}
          name="budget_category_id"
          required
          defaultValue={
            defaults?.budget_category_id ??
            categories[0]?.budget_category_id ??
            ""
          }
          className={selectClassName}
        >
          {categories.map((category) => (
            <option
              key={category.budget_category_id}
              value={category.budget_category_id}
            >
              {category.category_name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-year`}>Fiscal year</Label>
        <Input
          id={`${idPrefix}-year`}
          name="fiscal_year"
          type="number"
          min="2000"
          max="2100"
          required
          defaultValue={defaults?.fiscal_year ?? year}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-amount`}>Allocated amount</Label>
        <Input
          id={`${idPrefix}-amount`}
          name="allocated_amount"
          type="number"
          min="0.01"
          step="0.01"
          required
          defaultValue={defaults?.allocated_amount ?? ""}
        />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-remarks`}>Remarks</Label>
        <Input
          id={`${idPrefix}-remarks`}
          name="remarks"
          defaultValue={defaults?.remarks ?? ""}
        />
      </div>
    </div>
  );
}

function AddBudgetDialog({ categories }: { categories: BudgetCategory[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createBudget,
    initialState
  );

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button type="button" />}>
        <PlusIcon />
        Create budget
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Create budget</AlertDialogTitle>
          <AlertDialogDescription>
            Allocate a budget for a category and fiscal year.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction} id="add-budget-form" className="space-y-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <BudgetFormFields categories={categories} idPrefix="add" />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button type="submit" form="add-budget-form" disabled={pending}>
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

function EditBudgetDialog({
  row,
  categories,
}: {
  row: BudgetRow;
  categories: BudgetCategory[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateBudget,
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
            aria-label="Edit budget"
          />
        }
      >
        <PencilIcon />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Update budget</AlertDialogTitle>
          <AlertDialogDescription>
            Adjust allocation or remarks for this budget.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          action={formAction}
          id={`edit-budget-${row.budget_id}`}
          className="space-y-4"
        >
          <input type="hidden" name="budget_id" value={row.budget_id} />
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <BudgetFormFields
            categories={categories}
            idPrefix={`edit-${row.budget_id}`}
            defaults={row}
          />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            type="submit"
            form={`edit-budget-${row.budget_id}`}
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

function DeleteBudgetButton({ budgetId }: { budgetId: number }) {
  const [state, formAction, pending] = useActionState(
    deleteBudget,
    initialState
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="budget_id" value={budgetId} />
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
        aria-label="Delete budget"
      >
        {pending ? <Loader2 className="animate-spin" /> : <Trash2Icon />}
      </Button>
    </form>
  );
}

export function BudgetManager({
  budgets,
  categories,
}: {
  budgets: BudgetRow[];
  categories: BudgetCategory[];
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return budgets;
    return budgets.filter((row) => {
      const haystack = [
        row.category_name,
        String(row.fiscal_year),
        row.remarks,
        String(row.allocated_amount),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [budgets, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Budgets</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} allocation{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search budgets…"
            className="w-[220px]"
          />
          <AddBudgetDialog categories={categories} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No budgets yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="text-right">Spent</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => {
              const allocated = toNumber(row.allocated_amount);
              const remaining = allocated - row.spent;
              return (
                <TableRow key={row.budget_id}>
                  <TableCell>{row.fiscal_year}</TableCell>
                  <TableCell>{row.category_name || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(allocated)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(row.spent)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(remaining)}
                  </TableCell>
                  <TableCell className="max-w-[180px] truncate">
                    {row.remarks || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <EditBudgetDialog row={row} categories={categories} />
                      <DeleteBudgetButton budgetId={row.budget_id} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
