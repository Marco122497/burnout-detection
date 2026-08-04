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
import {
  getScaleOptions,
  STUDY_TIME_SCALE_DESCRIPTION,
  WORKLOAD_SCALE_DESCRIPTION,
} from "@/lib/student/questionnaires";
import { PSS_INTRO } from "@/lib/student/pss";
import type { AcademicTerm } from "@/lib/student/terms";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const initialState: StudentActionState = {};

const sectionTitles: Record<string, string> = {
  pss: "Section 1 — Perceived Stress Scale (PSS)",
  workload: "Section 2 — Academic Workload",
  study: "Section 3 — Study Time",
  sleep: "Section 4 — Sleep Hours",
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
  const [state, formAction, pending] = useActionState(
    submitWeeklyMonitoring,
    initialState
  );
  const [unansweredIds, setUnansweredIds] = useState<number[]>([]);
  const headerRef = useRef<HTMLDivElement>(null);
  const lastScrolledSuccess = useRef<string | undefined>(undefined);
  useActionToast(state);

  const alreadySubmitted = submittedThisWeek || Boolean(state.success);
  const ready = sections.every((section) => section.questions.length > 0);
  const disabled =
    pending ||
    alreadySubmitted ||
    !ready ||
    !term ||
    !monitoringEnabled;

  useEffect(() => {
    if (!state.success || state.success === lastScrolledSuccess.current) {
      return;
    }
    lastScrolledSuccess.current = state.success;
    headerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state.success]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const unanswered = getUnansweredQuestions(form, sections);

    if (unanswered.length === 0) {
      setUnansweredIds([]);
      return;
    }

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
  }

  return (
    <div className="space-y-6">
      <Card ref={headerRef} id="weekly-monitoring-status">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Weekly monitoring form</CardTitle>
              <CardDescription>
                Complete all four sections in one submission. Scores, MFBI, and
                burnout prediction are computed automatically.
              </CardDescription>
            </div>
            {alreadySubmitted ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900">
                <CheckCircle2Icon className="size-3.5" />
                Already submitted
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {term ? (
              <p>
                Active term: {term.academic_year} · {term.semester}. Current
                week:{" "}
                <span className="font-medium text-foreground">
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
              <p className="mt-1 text-emerald-800">
                You have already submitted monitoring for this week. Come back
                when the next weekly window opens.
              </p>
            ) : null}
            {!monitoringEnabled && term ? (
              <p className="mt-1 text-amber-800">
                Monitoring is closed. The form unlocks when Guidance opens the
                next weekly monitoring window.
              </p>
            ) : null}
            {!ready ? (
              <p className="mt-1 text-amber-800">
                Questionnaires are not seeded yet. Run{" "}
                <code>supabase/phase2-student.sql</code>.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <form
        action={formAction}
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6"
      >
        <input type="hidden" name="week_number" value={currentWeek ?? 1} />

        {sections.map((section) => {
          const options = getScaleOptions(section.key);
          return (
            <Card key={section.key}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {sectionTitles[section.key] ?? section.questionnaire_name}
                </CardTitle>
                <CardDescription>
                  {section.key === "pss"
                    ? PSS_INTRO
                    : section.key === "workload"
                      ? WORKLOAD_SCALE_DESCRIPTION
                      : section.key === "study"
                        ? STUDY_TIME_SCALE_DESCRIPTION
                        : section.key === "sleep"
                          ? "1 = Strongly Disagree · 2 = Disagree · 3 = Neutral · 4 = Agree · 5 = Strongly Agree. Reverse-scored items keep this scale and are reversed during scoring."
                          : section.description ||
                            "Answer every item using the 1–5 scale."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {section.questions.map((question, index) => {
                  const isMissing = unansweredIds.includes(question.question_id);
                  return (
                    <fieldset
                      key={question.question_id}
                      data-question-id={question.question_id}
                      className={cn(
                        "space-y-3 rounded-lg border p-3",
                        isMissing && "border-destructive bg-destructive/5"
                      )}
                      disabled={disabled}
                    >
                      <legend className="px-1 text-sm font-medium">
                        {index + 1}. {question.question_text}
                        {question.reverse_scored ? (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (reverse scored)
                          </span>
                        ) : null}
                      </legend>
                      <div className="grid gap-2 sm:grid-cols-5">
                        {options.map((option) => {
                          const classicScore = option.value - 1;
                          return (
                            <label
                              key={`${question.question_id}-${option.value}`}
                              className="flex cursor-pointer items-start gap-2 rounded-md border px-2 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                            >
                              <input
                                type="radio"
                                name={`q_${question.question_id}`}
                                value={option.value}
                                required={question.is_required}
                                className="mt-0.5"
                                onChange={() => {
                                  if (!isMissing) return;
                                  setUnansweredIds((prev) =>
                                    prev.filter(
                                      (id) => id !== question.question_id
                                    )
                                  );
                                }}
                                aria-label={
                                  section.key === "pss"
                                    ? `${classicScore} ${option.label}`
                                    : `${option.value} ${option.label}`
                                }
                              />
                              <span>
                                {section.key === "pss" ? (
                                  <span className="font-medium leading-snug">
                                    {classicScore} — {option.label}
                                  </span>
                                ) : (
                                  <>
                                    <span className="font-medium">
                                      {option.value}
                                    </span>
                                    <span className="block text-xs text-muted-foreground">
                                      {option.label}
                                    </span>
                                  </>
                                )}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        <Card>
          <CardContent className="pt-6">
            <Button type="submit" size="lg" disabled={disabled}>
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Processing assessment…
                </>
              ) : alreadySubmitted ? (
                "Already submitted"
              ) : (
                "Submit weekly monitoring"
              )}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
