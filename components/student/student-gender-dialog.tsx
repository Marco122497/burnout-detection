"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserRoundIcon } from "lucide-react";

import {
  setStudentGender,
  type StudentActionState,
} from "@/app/actions/student";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";

const selectClassName =
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

const initialState: StudentActionState = {};

export function StudentGenderDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [state, formAction, pending] = useActionState(
    setStudentGender,
    initialState
  );

  useActionToast(state);

  useEffect(() => {
    if (!state.success) return;
    setOpen(false);
    router.refresh();
  }, [state.success, router]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!state.success) return;
        setOpen(next);
      }}
    >
      <AlertDialogContent className="data-[size=default]:max-w-sm data-[size=default]:sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogMedia>
            <UserRoundIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>Select your gender</AlertDialogTitle>
          <AlertDialogDescription>
            The Guidance Office needs your gender on file for student wellness
            records. Please choose one to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form
          id="student-gender-form"
          action={formAction}
          className="space-y-2"
        >
          <Label htmlFor="student-gender-sex">Gender</Label>
          <select
            id="student-gender-sex"
            name="sex"
            required
            defaultValue=""
            disabled={pending}
            className={selectClassName}
          >
            <option value="" disabled>
              Select gender
            </option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </form>

        <AlertDialogFooter>
          <AlertDialogAction
            type="submit"
            form="student-gender-form"
            disabled={pending}
            className="sm:col-span-2"
          >
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : (
              "Save and continue"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
