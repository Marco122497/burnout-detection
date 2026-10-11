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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <CardTitle className="flex items-center gap-2 text-base">
          <StampIcon className="size-4" />
          Report names
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <p className="text-sm font-medium">Guidance counselor</p>
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label htmlFor="guidance_counselor_title">Title</Label>
            <Input
              id="guidance_counselor_title"
              name="guidance_counselor_title"
              defaultValue={guidanceCounselor.title}
              placeholder="Guidance Counselor"
              maxLength={120}
            />
          </div>
          <p className="pt-2 text-sm font-medium">School administrator</p>
          <div className="space-y-2">
            <Label htmlFor="school_administrator_name">Name</Label>
            <Input
              id="school_administrator_name"
              name="school_administrator_name"
              defaultValue={schoolAdministrator.name}
              placeholder="SR. LEONILA M. SAJELAN, MCM"
              maxLength={120}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="school_administrator_title">Title</Label>
            <Input
              id="school_administrator_title"
              name="school_administrator_title"
              defaultValue={schoolAdministrator.title}
              placeholder="School Vice-President"
              maxLength={120}
            />
          </div>
          <div>
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
