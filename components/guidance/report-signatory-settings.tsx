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
  guidanceCounselor,
}: {
  schoolAdministrator: SchoolAdministratorSignatory;
  guidanceCounselor: SchoolAdministratorSignatory;
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
          Edit the names and titles on printed reports. Each line appears above
          a signature and Date: __________.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid max-w-xl gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <p className="text-sm font-medium">Guidance Counselor</p>
            <p className="text-xs text-muted-foreground">
              Prepared by on guidance reports. Noted by on instructor reports.
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="guidance_counselor_name">Name</Label>
            <Input
              id="guidance_counselor_name"
              name="guidance_counselor_name"
              defaultValue={guidanceCounselor.name}
              placeholder="Guidance Counselor"
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="guidance_counselor_title">Title / position</Label>
            <Input
              id="guidance_counselor_title"
              name="guidance_counselor_title"
              defaultValue={guidanceCounselor.title}
              placeholder="Guidance Counselor"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">
              Appears under the name. Leave blank to reuse the name.
            </p>
          </div>
          <div className="space-y-1 border-t pt-4 sm:col-span-2">
            <p className="text-sm font-medium">School administrator</p>
            <p className="text-xs text-muted-foreground">
              Noted by on guidance reports. Approved by on instructor reports.
            </p>
          </div>
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
                "Save signatories"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
