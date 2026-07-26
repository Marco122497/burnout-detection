"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Loader2, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  createCategory,
  deleteCategory,
  updateCategory,
  type CategoryActionState,
  type CategoryKind,
} from "@/app/actions/categories";
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

const initialState: CategoryActionState = {};

export type CategoryRow = {
  id: number;
  name: string;
};

const KIND_COPY: Record<
  CategoryKind,
  { title: string; addTitle: string; addHint: string; search: string }
> = {
  donation: {
    title: "Donation types",
    addTitle: "Add donation type",
    addHint:
      "Used for Treasurer donations. Do not include “Collection” in the name.",
    search: "Search donation types…",
  },
  collection: {
    title: "Collection types",
    addTitle: "Add collection type",
    addHint:
      'Name should include “Collection” (e.g. Sunday Collection, Youth Collection).',
    search: "Search collection types…",
  },
  expense: {
    title: "Expense categories",
    addTitle: "Add expense category",
    addHint: "Available when recording Treasurer expenses.",
    search: "Search expense categories…",
  },
  budget: {
    title: "Budget categories",
    addTitle: "Add budget category",
    addHint: "Used for budget allocation and monitoring.",
    search: "Search budget categories…",
  },
};

function AddCategoryDialog({ kind }: { kind: CategoryKind }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createCategory,
    initialState
  );
  const copy = KIND_COPY[kind];

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button type="button" />}>
        <PlusIcon />
        {copy.addTitle}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.addTitle}</AlertDialogTitle>
          <AlertDialogDescription>{copy.addHint}</AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction} id="add-category-form" className="space-y-4">
          <input type="hidden" name="kind" value={kind} />
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="add-category-name">Name</Label>
            <Input id="add-category-name" name="category_name" required />
          </div>
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button type="submit" form="add-category-form" disabled={pending}>
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

function EditCategoryDialog({
  kind,
  row,
}: {
  kind: CategoryKind;
  row: CategoryRow;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateCategory,
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
            aria-label="Edit category"
          />
        }
      >
        <PencilIcon />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Edit category</AlertDialogTitle>
          <AlertDialogDescription>
            Rename this system category.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          action={formAction}
          id={`edit-category-${row.id}`}
          className="space-y-4"
        >
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="category_id" value={row.id} />
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor={`edit-category-name-${row.id}`}>Category name</Label>
            <Input
              id={`edit-category-name-${row.id}`}
              name="category_name"
              required
              defaultValue={row.name}
            />
          </div>
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            type="submit"
            form={`edit-category-${row.id}`}
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

function DeleteCategoryButton({
  kind,
  categoryId,
}: {
  kind: CategoryKind;
  categoryId: number;
}) {
  const [state, formAction, pending] = useActionState(
    deleteCategory,
    initialState
  );

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="category_id" value={categoryId} />
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
        aria-label="Delete category"
        title={state.error || "Delete category"}
      >
        {pending ? <Loader2 className="animate-spin" /> : <Trash2Icon />}
      </Button>
      {state.error && (
        <p className="mt-1 max-w-[180px] text-xs text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}

export function CategoryManager({
  kind,
  categories,
}: {
  kind: CategoryKind;
  categories: CategoryRow[];
}) {
  const [query, setQuery] = useState("");
  const copy = KIND_COPY[kind];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((row) => row.name.toLowerCase().includes(q));
  }, [categories, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{copy.title}</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} type{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.search}
            className="w-[220px]"
          />
          <AddCategoryDialog kind={kind} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No types yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <EditCategoryDialog kind={kind} row={row} />
                    <DeleteCategoryButton kind={kind} categoryId={row.id} />
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
