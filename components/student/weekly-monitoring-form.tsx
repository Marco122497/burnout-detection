"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";

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

const initialState: StudentActionState = {};

const sectionTitles: Record<string, string> = {
  pss: "Section 1 — Perceived Stress Scale (PSS)",
  workload: "Section 2 — Academic Workload",
  study: "Section 3 — Study Time",
  sleep: "Section 4 — Sleep Hours",
};

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
  useActionToast(state);

  const ready = sections.every((section) => section.questions.length > 0);
  const disabled =
    pending ||
    submittedThisWeek ||
    !ready ||
    !term ||
    !monitoringEnabled;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Weekly monitoring form</CardTitle>
          <CardDescription>
            Complete all four sections in one submission. Scores, MFBI, and
            burnout prediction are computed automatically.
          </CardDescription>
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
                  : submittedThisWeek
                    ? " · Already submitted this week"
                    : " · Open for submission"}
              </p>
            ) : (
              <p>No active academic term configured.</p>
            )}
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

      <form action={formAction} className="space-y-6">
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
                {section.questions.map((question, index) => (
                  <fieldset
                    key={question.question_id}
                    className="space-y-3 rounded-lg border p-3"
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
                ))}
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
              ) : submittedThisWeek ? (
                "Already submitted this week"
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
