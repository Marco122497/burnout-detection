"use client";

import { useActionState } from "react";
import { Loader2, StampIcon } from "lucide-react";

import {
  updateSchoolAdministratorSignatory,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { useActionToast } from "@/hooks/use-action-toast";
import type { SchoolAdministratorSignatory } from "@/lib/app-settings";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: GuidanceActionState = {};

export function ReportSignatorySettings({
  schoolAdministrator,
}: {
  schoolAdministrator: SchoolAdministratorSignatory;
}) {
  const [state, action, pending] = useActionState(
    updateSchoolAdministratorSignatory,
    initialState
  );
  useActionToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <StampIcon className="size-4" />
          Report signatories
        </CardTitle>
        <CardDescription>
          Edit the approving/noting officer name and title shown on printed and
          exported formal reports (Noted by / Approved by).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid max-w-xl gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="school_administrator_name">Name</Label>
            <Input
              id="school_administrator_name"
              name="school_administrator_name"
              defaultValue={schoolAdministrator.name}
              placeholder="SR. LEONILA M. SAJELAN, MCM"
              maxLength={120}
              required
            />
            <p className="text-xs text-muted-foreground">
              Appears on the signature name line (for example, a person&apos;s
              full name).
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="school_administrator_title">Title / position</Label>
            <Input
              id="school_administrator_title"
              name="school_administrator_title"
              defaultValue={schoolAdministrator.title}
              placeholder="School Vice-President"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              Appears under the name. Leave blank to reuse the name.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save signatory"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
