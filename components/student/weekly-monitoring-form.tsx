"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2Icon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  submitWeeklyMonitoring,
  type StudentActionState,
} from "@/app/actions/student";
import { useActionToast } from "@/hooks/use-action-toast";
import type { QuestionnaireSection } from "@/lib/student/questionnaires";
import { resolveScaleOptions } from "@/lib/student/scale-options";
import type { AcademicTerm } from "@/lib/student/terms";
import { useNavigationPending } from "@/components/layout/navigation-pending";
import { ScaleChoice } from "@/components/shared/scale-choice";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const initialState: StudentActionState = {};

const PROCESSING_STEPS = [
  {
    title: "Saving your responses",
    detail: "Storing this week’s answers securely.",
  },
  {
    title: "Computing your scores",
    detail: "Calculating stress, workload, study time, sleep, and MFBI.",
  },
  {
    title: "Running AI prediction",
    detail: "Analyzing burnout risk and next-week early warning signals.",
  },
  {
    title: "Preparing recommendations",
    detail: "Generating personalized guidance from your results.",
  },
  {
    title: "Almost done",
    detail: "Finishing notifications and opening your dashboard.",
  },
] as const;

const sectionTitles: Record<string, string> = {
  pss: "Section 1 — Stress Level",
  workload: "Section 2 — Academic Workload",
  study: "Section 3 — Study Time",
  sleep: "Section 4 — Sleep Hours",
};

/** Short purpose labels shown under each section title. */
const sectionPurposes: Record<string, string> = {
  pss: "Rate how stressed you felt this past week.",
  workload: "Rate how heavy your schoolwork felt this past week.",
  study: "Report how much time you spent studying outside class this past week.",
  sleep: "Rate how well you slept this past week.",
};

function getUnansweredQuestions(
  form: HTMLFormElement,
  sections: QuestionnaireSection[]
) {
  const data = new FormData(form);
  const unanswered: {
    questionId: number;
    sectionKey: string;
    sectionTitle: string;
    questionNumber: number;
  }[] = [];

  for (const section of sections) {
    section.questions.forEach((question, index) => {
      if (!question.is_required) return;
      const value = data.get(`q_${question.question_id}`);
      if (value == null || String(value).trim() === "") {
        unanswered.push({
          questionId: question.question_id,
          sectionKey: section.key,
          sectionTitle:
            sectionTitles[section.key] ?? section.questionnaire_name,
          questionNumber: index + 1,
        });
      }
    });
  }

  return unanswered;
}

export function WeeklyMonitoringForm({
  term,
  currentWeek,
  submittedThisWeek,
  monitoringEnabled,
  sections,
}: {
  term: AcademicTerm | null;
  currentWeek: number | null;
  submittedThisWeek: boolean;
  monitoringEnabled: boolean;
  sections: QuestionnaireSection[];
}) {
  const { navigate, setLockChrome } = useNavigationPending();
  const { state: sidebarState, isMobile } = useSidebar();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    submitWeeklyMonitoring,
    initialState
  );
  const [unansweredIds, setUnansweredIds] = useState<number[]>([]);
  const [formKey, setFormKey] = useState(0);
  const [processingStep, setProcessingStep] = useState(0);
  const [portalReady, setPortalReady] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const lastHandledSuccess = useRef<string | undefined>(undefined);
  useActionToast(state);

  const redirecting = Boolean(state.success);
  const busy = pending || redirecting;
  const alreadySubmitted = submittedThisWeek || Boolean(state.success);
  const ready = sections.every((section) => section.questions.length > 0);
  const disabled =
    busy ||
    alreadySubmitted ||
    !ready ||
    !term ||
    !monitoringEnabled;

  useEffect(() => {
    setPortalReady(true);
  }, []);

  // Mount AlertDialog only after hydration; open it from effects (not render).
  useEffect(() => {
    setShowProcessing(busy);
  }, [busy]);

  useEffect(() => {
    setLockChrome(busy);
    return () => setLockChrome(false);
  }, [busy, setLockChrome]);

  useEffect(() => {
    if (!pending) {
      if (redirecting) {
        setProcessingStep(PROCESSING_STEPS.length - 1);
      }
      return;
    }

    setProcessingStep(0);
    const timer = window.setInterval(() => {
      setProcessingStep((current) =>
        Math.min(current + 1, PROCESSING_STEPS.length - 2)
      );
    }, 4500);

    return () => window.clearInterval(timer);
  }, [pending, redirecting]);

  useEffect(() => {
    if (!state.success || state.success === lastHandledSuccess.current) {
      return;
    }
    lastHandledSuccess.current = state.success;
    navigate("/student");
  }, [state.success, navigate]);

  function clearAnswers() {
    if (disabled) return;
    formRef.current?.reset();
    setUnansweredIds([]);
    setFormKey((key) => key + 1);
    toast.message("All answers cleared.");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const unanswered = getUnansweredQuestions(form, sections);

    if (unanswered.length > 0) {
      event.preventDefault();

      const first = unanswered[0];
      setUnansweredIds([first.questionId]);

      toast.error("Please answer this question before submitting.", {
        description: `${first.sectionTitle} · Question ${first.questionNumber}`,
        duration: 5000,
      });

      const firstMissing = form.querySelector<HTMLElement>(
        `[data-question-id="${first.questionId}"]`
      );
      firstMissing?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setUnansweredIds([]);
  }

  return (
    <div className="relative space-y-6 pb-28 sm:pb-24">
      <Card id="weekly-monitoring-status" className="overflow-visible">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle className="text-xl font-bold">
                Weekly monitoring form
              </CardTitle>
              <CardDescription>
                Complete all four sections in one submission. Scores, MFBI, and
                burnout prediction are computed automatically.
              </CardDescription>
            </div>
            {alreadySubmitted ? (
              <span className="student-chum-pill">
                <CheckCircle2Icon className="size-3.5" />
                Already submitted
              </span>
            ) : (
              <span className="student-chum-pill">Open this week</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/60 px-4 py-3 text-sm text-muted-foreground">
            {term ? (
              <p>
                Active term: {term.academic_year} · {term.semester}. Current
                week:{" "}
                <span className="font-semibold text-foreground">
                  {currentWeek}
                </span>
                {!monitoringEnabled
                  ? " · Closed by Guidance"
                  : alreadySubmitted
                    ? " · Already submitted"
                    : " · Open for submission"}
              </p>
            ) : (
              <p>No active academic term configured.</p>
            )}
            {alreadySubmitted && monitoringEnabled ? (
              <p className="student-chum-tip mt-3 px-3 py-2 text-sm">
                You have already submitted monitoring for this week. Come back
                when the next weekly window opens.
              </p>
            ) : null}
            {!monitoringEnabled && term ? (
              <p className="mt-2 text-amber-800 dark:text-amber-200">
                Monitoring is closed. The form unlocks when Guidance opens the
                next weekly monitoring window.
              </p>
            ) : null}
            {!ready ? (
              <p className="mt-2 text-amber-800 dark:text-amber-200">
                Questionnaires are not seeded yet. Run{" "}
                <code>supabase/phase2-student.sql</code>.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <form
        id="weekly-monitoring-form"
        key={formKey}
        ref={formRef}
        action={formAction}
        onSubmit={handleSubmit}
        noValidate
        aria-busy={busy}
        className="space-y-6"
      >
        <input type="hidden" name="week_number" value={currentWeek ?? 1} />

        {sections.map((section, sectionIndex) => (
          <Card key={section.key}>
            <CardHeader>
              <div className="mb-1">
                <span className="student-chum-pill">
                  Step {sectionIndex + 1} of {sections.length}
                </span>
              </div>
              <CardTitle className="text-lg font-bold">
                {sectionTitles[section.key] ?? section.questionnaire_name}
              </CardTitle>
              <CardDescription>
                {sectionPurposes[section.key] ??
                  section.description ??
                  "Answer every item using the response scale shown for each question."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {section.questions.map((question, index) => {
                const isMissing = unansweredIds.includes(question.question_id);
                const options = resolveScaleOptions(
                  section.key,
                  question,
                  section.questionnaire_name
                );
                return (
                  <fieldset
                    key={question.question_id}
                    data-question-id={question.question_id}
                    className={cn(
                      "space-y-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--muted)]/35 p-3.5",
                      isMissing && "border-destructive bg-destructive/5"
                    )}
                    disabled={disabled}
                  >
                    <legend className="px-1 text-sm font-bold">
                      {index + 1}. {question.question_text}
                      {question.reverse_scored ? (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (reverse scored)
                        </span>
                      ) : null}
                    </legend>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
                      {options.map((option) => {
                        const displayScore =
                          section.key === "pss"
                            ? option.value - 1
                            : option.value;

                        return (
                          <ScaleChoice
                            key={`${question.question_id}-${option.value}`}
                            name={`q_${question.question_id}`}
                            value={option.value}
                            displayScore={displayScore}
                            label={option.label}
                            required={question.is_required}
                            disabled={disabled}
                            onSelect={() => {
                              if (!isMissing) return;
                              setUnansweredIds((prev) =>
                                prev.filter(
                                  (id) => id !== question.question_id
                                )
                              );
                            }}
                          />
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </form>

      {/* Fixed to the main content column only (not over the sidebar). */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-30 border-t border-[color:var(--border)]",
          "bg-[color:var(--card)]/95 backdrop-blur-md",
          "px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(20_60_40_/_10%)] sm:px-8",
          isMobile
            ? "left-0"
            : sidebarState === "collapsed"
              ? "left-[var(--sidebar-width-icon)]"
              : "left-[var(--sidebar-width)]"
        )}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          {!alreadySubmitted && monitoringEnabled && ready ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="order-2 mx-0.5 w-[calc(100%-0.25rem)] rounded-full px-6 py-3 sm:order-1 sm:mx-0 sm:w-auto sm:min-w-[9.5rem]"
              disabled={disabled}
              onClick={clearAnswers}
            >
              Clear answers
            </Button>
          ) : null}
          <Button
            type="submit"
            form="weekly-monitoring-form"
            size="lg"
            className="order-1 mx-0.5 w-[calc(100%-0.25rem)] rounded-full px-7 py-3 text-base sm:order-2 sm:mx-0 sm:w-auto"
            disabled={disabled}
          >
            {redirecting ? (
              <>
                <Loader2 className="animate-spin" />
                Redirecting…
              </>
            ) : pending ? (
              <>
                <Loader2 className="animate-spin" />
                Processing assessment…
              </>
            ) : alreadySubmitted ? (
              "Already submitted"
            ) : (
              "Submit weekly monitoring →"
            )}
          </Button>
        </div>
      </div>

      {portalReady ? (
        <AlertDialog
          open={showProcessing}
          onOpenChange={(nextOpen) => {
            // Keep open while submit/redirect is in progress.
            if (busy && !nextOpen) return;
            setShowProcessing(nextOpen);
          }}
        >
          <AlertDialogContent
            size="default"
            className={cn(
              "gap-3 p-3 sm:gap-4 sm:p-4",
              // Near full-width on phones — avoid large empty left/right margins.
              "w-[calc(100%-0.75rem)] max-w-[calc(100%-0.75rem)]",
              "data-[size=default]:max-w-[calc(100%-0.75rem)] data-[size=default]:sm:max-w-sm",
              "sm:w-full sm:place-items-stretch"
            )}
          >
            <AlertDialogHeader className="place-items-center text-center sm:place-items-center sm:text-center">
              <AlertDialogMedia className="rounded-full">
                {redirecting ? (
                  <CheckCircle2Icon className="text-primary" />
                ) : (
                  <Loader2 className="animate-spin text-primary" />
                )}
              </AlertDialogMedia>
              <AlertDialogTitle>
                {redirecting
                  ? "Assessment complete"
                  : "Processing your assessment"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {redirecting
                  ? "Redirecting you to your dashboard…"
                  : "Scoring responses and running AI analysis. Keep this window open."}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4" aria-live="polite">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="truncate font-medium text-foreground">
                    {PROCESSING_STEPS[processingStep]?.title}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {redirecting
                      ? PROCESSING_STEPS.length
                      : processingStep + 1}
                    /{PROCESSING_STEPS.length}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                    style={{
                      width: `${
                        ((redirecting
                          ? PROCESSING_STEPS.length
                          : processingStep + 1) /
                          PROCESSING_STEPS.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              <ul className="space-y-2 rounded-lg border bg-muted/40 p-3">
                {PROCESSING_STEPS.map((step, index) => {
                  const done = index < processingStep || redirecting;
                  const active = index === processingStep && !redirecting;
                  return (
                    <li
                      key={step.title}
                      className={cn(
                        "flex items-center gap-2.5 text-sm",
                        done && "text-foreground",
                        active && "font-medium text-foreground",
                        !done && !active && "text-muted-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                          done && "bg-primary text-primary-foreground",
                          active && "border border-primary text-primary",
                          !done &&
                            !active &&
                            "border border-border bg-background text-muted-foreground"
                        )}
                        aria-hidden
                      >
                        {done ? (
                          <CheckCircle2Icon className="size-3.5" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span>{step.title}</span>
                    </li>
                  );
                })}
              </ul>

              {!redirecting ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  This may take a moment if the AI service is starting up. Your
                  answers are already saved.
                </p>
              ) : null}
            </div>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
