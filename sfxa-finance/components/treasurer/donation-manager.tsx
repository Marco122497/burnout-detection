"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Loader2, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";

import {
  createDonation,
  deleteDonation,
  updateDonation,
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

export type DonationCategory = {
  category_id: number;
  category_name: string;
};

export type DonationRow = {
  donation_id: number;
  donor_name: string | null;
  category_id: number | null;
  amount: number | string;
  donation_date: string;
  remarks: string | null;
  category_name: string | null;
};

function DonationFormFields({
  categories,
  defaults,
  idPrefix,
}: {
  categories: DonationCategory[];
  defaults?: Partial<DonationRow>;
  idPrefix: string;
}) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-donor`}>Donor name</Label>
        <Input
          id={`${idPrefix}-donor`}
          name="donor_name"
          defaultValue={defaults?.donor_name ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-category`}>Category</Label>
        <select
          id={`${idPrefix}-category`}
          name="category_id"
          required
          defaultValue={defaults?.category_id ?? categories[0]?.category_id ?? ""}
          className={selectClassName}
        >
          {categories.map((category) => (
            <option key={category.category_id} value={category.category_id}>
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
          name="donation_date"
          type="date"
          required
          defaultValue={defaults?.donation_date ?? today}
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

function AddDonationDialog({
  categories,
  defaultCategoryId,
}: {
  categories: DonationCategory[];
  defaultCategoryId?: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    createDonation,
    initialState
  );

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button type="button" />}>
        <PlusIcon />
        Add donation
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Add donation</AlertDialogTitle>
          <AlertDialogDescription>
            Record a donation or collection entry.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={formAction} id="add-donation-form" className="space-y-4">
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <DonationFormFields
            categories={categories}
            idPrefix="add"
            defaults={{
              category_id: defaultCategoryId ?? categories[0]?.category_id,
            }}
          />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button type="submit" form="add-donation-form" disabled={pending}>
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

function EditDonationDialog({
  row,
  categories,
}: {
  row: DonationRow;
  categories: DonationCategory[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateDonation,
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
            aria-label="Edit donation"
          />
        }
      >
        <PencilIcon />
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>Edit donation</AlertDialogTitle>
          <AlertDialogDescription>
            Update donation details.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form
          action={formAction}
          id={`edit-donation-${row.donation_id}`}
          className="space-y-4"
        >
          <input type="hidden" name="donation_id" value={row.donation_id} />
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <DonationFormFields
            categories={categories}
            idPrefix={`edit-${row.donation_id}`}
            defaults={row}
          />
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            type="submit"
            form={`edit-donation-${row.donation_id}`}
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

function DeleteDonationButton({ donationId }: { donationId: number }) {
  const [state, formAction, pending] = useActionState(
    deleteDonation,
    initialState
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="donation_id" value={donationId} />
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
        aria-label="Delete donation"
      >
        {pending ? <Loader2 className="animate-spin" /> : <Trash2Icon />}
      </Button>
    </form>
  );
}

export function DonationManager({
  donations,
  categories,
  defaultCategoryId,
  title = "Donations",
  emptyMessage = "No donations yet.",
}: {
  donations: DonationRow[];
  categories: DonationCategory[];
  defaultCategoryId?: number;
  title?: string;
  emptyMessage?: string;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return donations;
    return donations.filter((row) => {
      const haystack = [
        row.donor_name,
        row.category_name,
        row.remarks,
        String(row.amount),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [donations, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} record{filtered.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search donations…"
            className="w-[220px]"
          />
          <AddDonationDialog
            categories={categories}
            defaultCategoryId={defaultCategoryId}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Donor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-[88px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <TableRow key={row.donation_id}>
                <TableCell>{formatDate(row.donation_date)}</TableCell>
                <TableCell>{row.donor_name || "—"}</TableCell>
                <TableCell>{row.category_name || "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {row.remarks || "—"}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(row.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <EditDonationDialog row={row} categories={categories} />
                    <DeleteDonationButton donationId={row.donation_id} />
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
