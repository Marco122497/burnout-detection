"use client";

import { useActionState } from "react";
import { ShieldIcon, Loader2 } from "lucide-react";

import {
  updateOtherAdminQuestionEdit,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: GuidanceActionState = {};

export function OtherAdminAccessSettings({
  canEditQuestions,
}: {
  canEditQuestions: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateOtherAdminQuestionEdit,
    initialState
  );
  useActionToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldIcon className="size-4" />
          Other admin access
        </CardTitle>
        <CardDescription>
          Choose what guidance accounts other than superadmin@school.edu can
          do with questionnaires.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex items-center justify-between gap-4">
          <input
            type="hidden"
            name="other_admin_question_edit"
            value={canEditQuestions ? "false" : "true"}
          />
          <div className="space-y-1">
            <Label htmlFor="other-admin-question-edit">
              Allow other admins to edit questionnaires
            </Label>
            <p className="text-sm text-muted-foreground">
              {canEditQuestions
                ? "On. Other admins can add, edit, delete, and change question numbers."
                : "Off. Other admins can view questions only. They cannot edit, delete, or change question numbers."}
            </p>
          </div>
          <button
            id="other-admin-question-edit"
            type="submit"
            role="switch"
            aria-checked={canEditQuestions}
            disabled={pending}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              canEditQuestions ? "bg-primary" : "bg-input"
            )}
          >
            {pending ? (
              <Loader2 className="mx-auto size-3.5 animate-spin text-primary-foreground" />
            ) : (
              <span
                className={cn(
                  "pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform",
                  canEditQuestions ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            )}
            <span className="sr-only">
              {canEditQuestions
                ? "Limit other admins to viewing questions"
                : "Allow other admins to edit questions"}
            </span>
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
