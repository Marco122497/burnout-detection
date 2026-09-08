"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileTextIcon, Loader2 } from "lucide-react";

import {
  submitResearchConsent,
  type StudentActionState,
} from "@/app/actions/student";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RESEARCH_CONSENT_VERSION } from "@/lib/student/research-consent";
import { cn } from "@/lib/utils";

const initialState: StudentActionState = {};

export function StudentResearchConsentGate({
  studentNumber,
  declined,
}: {
  studentNumber?: string | null;
  declined?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [readUnderstood, setReadUnderstood] = useState(false);
  const [voluntarilyAgreed, setVoluntarilyAgreed] = useState(false);
  const [state, formAction, pending] = useActionState(
    submitResearchConsent,
    initialState
  );

  useActionToast(state);

  useEffect(() => {
    if (!state.success) return;
    setOpen(false);
    router.refresh();
  }, [state.success, router]);

  const canAgree = readUnderstood && voluntarilyAgreed && !pending;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Keep open until the student records a decision successfully.
        if (!state.success) return;
        setOpen(next);
      }}
    >
      <AlertDialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 data-[size=default]:max-w-lg data-[size=default]:sm:max-w-2xl">
        <div className="border-b border-[color:var(--border)] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--chum-green-soft,#e8f8ef)] text-[color:var(--chum-green-deep,#1f9a5c)]">
              <FileTextIcon className="size-5" />
            </div>
            <div className="min-w-0 space-y-1 text-left">
              <p className="student-chum-pill w-fit text-[0.7rem]">
                Electronic{" "}
                <span className="font-extrabold">informed consent</span> ·{" "}
                {RESEARCH_CONSENT_VERSION}
              </p>
              <AlertDialogTitle className="text-xl font-bold tracking-tight sm:text-2xl">
                Informed Consent
              </AlertDialogTitle>
              {studentNumber ? (
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  Student ID:{" "}
                  <span className="font-medium text-foreground">
                    {studentNumber}
                  </span>
                </AlertDialogDescription>
              ) : (
                <AlertDialogDescription className="sr-only">
                  Electronic informed consent form
                </AlertDialogDescription>
              )}
            </div>
          </div>
        </div>

        <div className="max-h-[min(22rem,45vh)] space-y-3 overflow-y-auto px-5 py-4 text-sm leading-relaxed text-muted-foreground sm:px-6">
          {declined ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-950">
              You previously selected <strong>I Do Not Agree</strong>. Weekly
              monitoring stays unavailable until you voluntarily agree to
              participate.
            </div>
          ) : null}

          <p>
            You are invited by the Guidance Office to take part in this academic
            burnout monitoring and early-warning system for college students.
          </p>
          <p>
            The purpose of this system is to develop and evaluate an AI-based
            system that uses selected academic and behavioral information,
            including stress level, academic workload, sleep hours, and study
            time, to provide an early indication of academic burnout risk.
          </p>
          <p>
            Your participation involves completing a short weekly monitoring
            form. The information you provide will be used for system
            development, machine learning model training and evaluation, and
            academic research.
          </p>
          <p>
            Your participation is voluntary. You may choose not to participate
            or withdraw from the study without academic penalty or disadvantage.
            Your information will be treated confidentially and accessed only by
            authorized persons for the purposes of the system.
          </p>
          <p>
            The system provides an early-warning assessment and is not a medical
            or psychological diagnosis.
          </p>
          <p className="font-medium text-foreground">
            By selecting “I Agree,” you confirm that you have read and
            understood the information above and voluntarily agree to
            participate in the study.
          </p>
        </div>

        <form
          id="student-research-consent-form"
          action={formAction}
          className="space-y-3 border-t px-5 py-4 sm:px-6"
        >
          <div className="space-y-2.5">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={readUnderstood}
                disabled={pending}
                onChange={(event) => setReadUnderstood(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span>I have read and understood the information above.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={voluntarilyAgreed}
                disabled={pending}
                onChange={(event) => setVoluntarilyAgreed(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span>I voluntarily agree to participate in this study.</span>
            </label>
          </div>

          <input
            type="hidden"
            name="read_understood"
            value={readUnderstood ? "1" : "0"}
          />
          <input
            type="hidden"
            name="voluntarily_agreed"
            value={voluntarilyAgreed ? "1" : "0"}
          />
        </form>

        <AlertDialogFooter className="border-t px-5 py-4 sm:px-6">
          <Button
            type="submit"
            form="student-research-consent-form"
            name="decision"
            value="Declined"
            variant="outline"
            size="lg"
            disabled={pending}
            className={cn("rounded-full")}
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            I Do Not Agree
          </Button>
          <Button
            type="submit"
            form="student-research-consent-form"
            name="decision"
            value="Agreed"
            size="lg"
            disabled={!canAgree}
            className="rounded-full"
          >
            {pending ? <Loader2 className="animate-spin" /> : null}
            I Agree and Continue
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
