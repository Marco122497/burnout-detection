"use client";

import { useActionState, useEffect, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, Loader2, PencilIcon, PlusIcon, PowerIcon, Trash2Icon } from "lucide-react";

import {
  createQuestion,
  deleteQuestion,
  moveQuestionOrder,
  toggleQuestionStatus,
  toggleQuestionnaireStatus,
  updateQuestion,
  updateQuestionnaireSettings,
  type QuestionnaireActionState,
} from "@/app/actions/questionnaires";
import { useActionToast } from "@/hooks/use-action-toast";
import type {
  QuestionRow,
  QuestionnaireRow,
} from "@/lib/guidance/questionnaires";
import { useNavigationPending } from "@/components/layout/navigation-pending";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: QuestionnaireActionState = {};
const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const textareaClassName =
  "min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function QuestionFields({
  question,
  includeActive,
  idPrefix = "",
}: {
  question?: QuestionRow | null;
  includeActive?: boolean;
  idPrefix?: string;
}) {
  const id = (name: string) => `${idPrefix}${name}`;

  return (
    <>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor={id("question_text")}>Question text</Label>
        <textarea
          id={id("question_text")}
          name="question_text"
          required
          rows={3}
          defaultValue={question?.question_text ?? ""}
          className={textareaClassName}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("response_type")}>Response type</Label>
        <select
          id={id("response_type")}
          name="response_type"
          defaultValue={question?.response_type ?? "Likert Scale"}
          className={selectClassName}
        >
          <option value="Likert Scale">Likert Scale</option>
          <option value="Number">Number</option>
          <option value="Hours">Hours</option>
          <option value="Yes/No">Yes/No</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("question_order")}>Order</Label>
        <Input
          id={id("question_order")}
          name="question_order"
          type="number"
          min={1}
          defaultValue={question?.question_order ?? ""}
          placeholder="Auto"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("reverse_scored")}>Reverse scored</Label>
        <select
          id={id("reverse_scored")}
          name="reverse_scored"
          defaultValue={question?.reverse_scored ? "1" : "0"}
          className={selectClassName}
        >
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={id("is_required")}>Required</Label>
        <select
          id={id("is_required")}
          name="is_required"
          defaultValue={question?.is_required === false ? "0" : "1"}
          className={selectClassName}
        >
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>
      </div>
      {includeActive && question ? (
        <div className="space-y-2">
          <Label htmlFor={id("is_active")}>Active</Label>
          <select
            id={id("is_active")}
            name="is_active"
            defaultValue={question.is_active ? "1" : "0"}
            className={selectClassName}
          >
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
      ) : null}
    </>
  );
}

export function QuestionnairesList({
  questionnaires,
}: {
  questionnaires: QuestionnaireRow[];
}) {
  const { navigate, isPending, pendingHref } = useNavigationPending();
  const [toggleState, toggleAction, togglePending] = useActionState(
    toggleQuestionnaireStatus,
    initialState
  );
  useActionToast(toggleState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Questionnaires</CardTitle>
        <CardDescription>
          Manage PSS, Academic Workload, Study Time, and Sleep Hours forms used
          in weekly monitoring.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {questionnaires.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No questionnaires found. Seed questionnaires in the database first.
          </p>
        ) : (
          questionnaires.map((item) => {
            const manageHref = `/guidance/questionnaires/${item.questionnaire_id}`;
            const manageLoading =
              isPending && pendingHref === manageHref;

            return (
            <div
              key={item.questionnaire_id}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{item.questionnaire_name}</p>
                <p className="text-sm text-muted-foreground">
                  {item.total_questions} active questions ·{" "}
                  {item.is_active ? "Enabled" : "Disabled"}
                </p>
                {item.description ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={manageLoading}
                  onClick={() => navigate(manageHref)}
                >
                  {manageLoading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Loading…
                    </>
                  ) : (
                    "Manage"
                  )}
                </Button>
                <form action={toggleAction}>
                  <input
                    type="hidden"
                    name="questionnaire_id"
                    value={item.questionnaire_id}
                  />
                  <input
                    type="hidden"
                    name="is_active"
                    value={item.is_active ? "0" : "1"}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={togglePending}
                  >
                    {item.is_active ? "Disable" : "Enable"}
                  </Button>
                </form>
              </div>
            </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function QuestionnaireDetailManager({
  questionnaire,
  questions,
}: {
  questionnaire: QuestionnaireRow;
  questions: QuestionRow[];
}) {
  const { navigate, isPending, pendingHref } = useNavigationPending();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [preview, setPreview] = useState(false);

  const [settingsState, settingsAction, settingsPending] = useActionState(
    updateQuestionnaireSettings,
    initialState
  );
  const [createState, createAction, createPending] = useActionState(
    createQuestion,
    initialState
  );
  const [updateState, updateAction, updatePending] = useActionState(
    updateQuestion,
    initialState
  );
  const [toggleState, toggleAction, togglePending] = useActionState(
    toggleQuestionStatus,
    initialState
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteQuestion,
    initialState
  );
  const [moveState, moveAction, movePending] = useActionState(
    moveQuestionOrder,
    initialState
  );

  useActionToast(settingsState);
  useActionToast(createState);
  useActionToast(updateState);
  useActionToast(toggleState);
  useActionToast(deleteState);
  useActionToast(moveState);

  const editing = questions.find((q) => q.question_id === editingId) ?? null;
  const deleting =
    questions.find((q) => q.question_id === deletingId) ?? null;
  const activeQuestions = questions.filter((q) => q.is_active);
  const editDialogOpen = editingId != null;
  const deleteDialogOpen = deletingId != null;
  const isSleepHoursQuestionnaire = /sleep/i.test(
    questionnaire.questionnaire_name
  );
  const isPssQuestionnaire = /perceived stress|pss/i.test(
    questionnaire.questionnaire_name
  );
  const isWorkloadQuestionnaire = /academic workload/i.test(
    questionnaire.questionnaire_name
  );
  const isStudyTimeQuestionnaire = /study time/i.test(
    questionnaire.questionnaire_name
  );

  useEffect(() => {
    if (updateState.success) {
      setEditingId(null);
    }
  }, [updateState.success]);

  useEffect(() => {
    if (createState.success) {
      setAddOpen(false);
    }
  }, [createState.success]);

  useEffect(() => {
    if (deleteState.success) {
      setDeletingId(null);
    }
  }, [deleteState.success]);

  function openEditQuestion(questionId: number) {
    setEditingId(questionId);
  }

  function closeEditQuestion(open: boolean) {
    if (!open) setEditingId(null);
  }

  function openDeleteQuestion(questionId: number) {
    setDeletingId(questionId);
  }

  function closeDeleteQuestion(open: boolean) {
    if (!open) setDeletingId(null);
  }

  function openAddQuestion() {
    setAddOpen(true);
  }

  function closeAddQuestion(open: boolean) {
    setAddOpen(open);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            Questionnaire management
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
            {questionnaire.questionnaire_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add, edit, reorder, and configure reverse-scored items.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPreview((v) => !v)}
          >
            {preview ? "Hide preview" : "Preview questionnaire"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={
              isPending && pendingHref === "/guidance/questionnaires"
            }
            onClick={() => navigate("/guidance/questionnaires")}
          >
            {isPending && pendingHref === "/guidance/questionnaires" ? (
              <>
                <Loader2 className="animate-spin" />
                Loading…
              </>
            ) : (
              "Back to list"
            )}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Questionnaire settings</CardTitle>
          <CardDescription>
            Enable or disable this form and configure availability schedule.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={settingsAction} className="grid gap-4 sm:grid-cols-2">
            <input
              type="hidden"
              name="questionnaire_id"
              value={questionnaire.questionnaire_id}
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={questionnaire.description ?? ""}
                className={textareaClassName}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="available_from">Available from</Label>
              <Input
                id="available_from"
                name="available_from"
                type="datetime-local"
                defaultValue={toDatetimeLocal(questionnaire.available_from)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="available_until">Available until</Label>
              <Input
                id="available_until"
                name="available_until"
                type="datetime-local"
                defaultValue={toDatetimeLocal(questionnaire.available_until)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_active">Status</Label>
              <select
                id="is_active"
                name="is_active"
                defaultValue={questionnaire.is_active ? "1" : "0"}
                className={selectClassName}
              >
                <option value="1">Enabled</option>
                <option value="0">Disabled</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={settingsPending}>
                {settingsPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Save settings"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Active questions in student-facing order.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isPssQuestionnaire ? (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
                <div>
                  <p className="font-medium">Perceived Stress Scale (PSS-10)</p>
                  <p className="mt-1 text-muted-foreground">
                    The questions ask about your feelings and thoughts during
                    the last month. Indicate how often you felt or thought a
                    certain way. Answer fairly quickly — choose a reasonable
                    estimate for each item.
                  </p>
                </div>
                <div>
                  <p className="font-medium">Response scale</p>
                  <ul className="mt-1 space-y-0.5 text-muted-foreground">
                    <li>0 = Never</li>
                    <li>1 = Almost Never</li>
                    <li>2 = Sometimes</li>
                    <li>3 = Fairly Often</li>
                    <li>4 = Very Often</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Scoring</p>
                  <p className="mt-1 text-muted-foreground">
                    Normal items: use the response score as-is (0–4).
                  </p>
                  <p className="text-muted-foreground">
                    Reverse-scored items (questions 4, 5, 7, and 8): 0↔4, 1↔3,
                    2 stays 2, 3↔1, 4↔0.
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Total score = sum of all 10 items after reverse scoring
                    (0–40). Higher scores mean higher perceived stress.
                  </p>
                  <p className="text-muted-foreground">
                    0–13 Low · 14–26 Moderate · 27–40 High perceived stress
                  </p>
                </div>
              </div>
            ) : null}
            {isWorkloadQuestionnaire ? (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Likert scale (Academic Workload)</p>
                <p className="text-muted-foreground">
                  5-point Likert scale: 1 = Definitely Disagree · 2 = Disagree
                  · 3 = Neutral · 4 = Agree · 5 = Definitely Agree
                </p>
              </div>
            ) : null}
            {isStudyTimeQuestionnaire ? (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Response scale (Study Time)</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  <li>1 = Less than 1 hour per day</li>
                  <li>2 = 1–2 hours per day</li>
                  <li>3 = 3–4 hours per day</li>
                  <li>4 = 5–6 hours per day</li>
                  <li>5 = More than 6 hours per day</li>
                </ul>
              </div>
            ) : null}
            {isSleepHoursQuestionnaire ? (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                <p className="font-medium">Likert scale (Sleep Hours)</p>
                <p className="text-muted-foreground">
                  Normal: 1 = Strongly Disagree · 2 = Disagree · 3 = Neutral ·
                  4 = Agree · 5 = Strongly Agree
                </p>
                <p className="text-muted-foreground">
                  Reverse scored: 1 = Strongly Agree · 2 = Agree · 3 = Neutral ·
                  4 = Disagree · 5 = Strongly Disagree
                </p>
              </div>
            ) : null}
            {activeQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active questions to preview.
              </p>
            ) : (
              activeQuestions.map((q, index) => (
                <div key={q.question_id} className="rounded-lg border p-3">
                  <p className="text-sm font-medium">
                    {index + 1}. {q.question_text}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {q.response_type}
                    {q.reverse_scored ? " · Reverse scored" : ""}
                    {q.is_required ? " · Required" : ""}
                  </p>
                  {isPssQuestionnaire && q.response_type === "Likert Scale" ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {q.reverse_scored
                        ? "Reverse scoring: Never (0) → 4, Almost Never (1) → 3, Sometimes (2) → 2, Fairly Often (3) → 1, Very Often (4) → 0"
                        : "Normal scoring: Never = 0 · Almost Never = 1 · Sometimes = 2 · Fairly Often = 3 · Very Often = 4"}
                    </p>
                  ) : null}
                  {isWorkloadQuestionnaire &&
                  q.response_type === "Likert Scale" ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {q.reverse_scored
                        ? "Scale: 1 = Definitely Agree · 2 = Agree · 3 = Neutral · 4 = Disagree · 5 = Definitely Disagree"
                        : "Scale: 1 = Definitely Disagree · 2 = Disagree · 3 = Neutral · 4 = Agree · 5 = Definitely Agree"}
                    </p>
                  ) : null}
                  {isStudyTimeQuestionnaire && q.response_type === "Hours" ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Score 1–5 using the hours-per-day response scale above.
                    </p>
                  ) : null}
                  {isSleepHoursQuestionnaire &&
                  q.response_type === "Likert Scale" ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {q.reverse_scored
                        ? "Scale: 1 = Strongly Agree · 2 = Agree · 3 = Neutral · 4 = Disagree · 5 = Strongly Disagree"
                        : "Scale: 1 = Strongly Disagree · 2 = Disagree · 3 = Neutral · 4 = Agree · 5 = Strongly Agree"}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Questions</CardTitle>
            <CardDescription>
              Arrange order with the arrows. Add or edit opens a dialog.
              Deactivate questions without deleting historical answers.
            </CardDescription>
          </div>
          <Button type="button" onClick={openAddQuestion}>
            <PlusIcon className="size-4" />
            Add question
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {questions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No questions yet.</p>
          ) : (
            questions.map((question, index) => (
              <div
                key={question.question_id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {question.question_order}. {question.question_text}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {question.response_type}
                    {question.reverse_scored ? " · Reverse scored" : ""}
                    {question.is_required ? " · Required" : ""}
                    {" · "}
                    {question.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  <form action={moveAction}>
                    <input
                      type="hidden"
                      name="question_id"
                      value={question.question_id}
                    />
                    <input
                      type="hidden"
                      name="questionnaire_id"
                      value={questionnaire.questionnaire_id}
                    />
                    <input type="hidden" name="direction" value="up" />
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="submit"
                            size="icon-sm"
                            variant="outline"
                            disabled={movePending || index === 0}
                            aria-label="Move up"
                          >
                            <ArrowUpIcon />
                          </Button>
                        }
                      />
                      <TooltipContent>Move up</TooltipContent>
                    </Tooltip>
                  </form>
                  <form action={moveAction}>
                    <input
                      type="hidden"
                      name="question_id"
                      value={question.question_id}
                    />
                    <input
                      type="hidden"
                      name="questionnaire_id"
                      value={questionnaire.questionnaire_id}
                    />
                    <input type="hidden" name="direction" value="down" />
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="submit"
                            size="icon-sm"
                            variant="outline"
                            disabled={
                              movePending || index === questions.length - 1
                            }
                            aria-label="Move down"
                          >
                            <ArrowDownIcon />
                          </Button>
                        }
                      />
                      <TooltipContent>Move down</TooltipContent>
                    </Tooltip>
                  </form>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label="Edit question"
                          onClick={() => openEditQuestion(question.question_id)}
                        >
                          <PencilIcon />
                        </Button>
                      }
                    />
                    <TooltipContent>Edit</TooltipContent>
                  </Tooltip>
                  <form action={toggleAction}>
                    <input
                      type="hidden"
                      name="question_id"
                      value={question.question_id}
                    />
                    <input
                      type="hidden"
                      name="questionnaire_id"
                      value={questionnaire.questionnaire_id}
                    />
                    <input
                      type="hidden"
                      name="is_active"
                      value={question.is_active ? "0" : "1"}
                    />
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="submit"
                            size="icon-sm"
                            variant="ghost"
                            disabled={togglePending}
                            aria-label={
                              question.is_active ? "Deactivate" : "Activate"
                            }
                          >
                            <PowerIcon />
                          </Button>
                        }
                      />
                      <TooltipContent>
                        {question.is_active ? "Deactivate" : "Activate"}
                      </TooltipContent>
                    </Tooltip>
                  </form>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete question"
                          onClick={() =>
                            openDeleteQuestion(question.question_id)
                          }
                        >
                          <Trash2Icon />
                        </Button>
                      }
                    />
                    <TooltipContent>Delete</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AlertDialog open={addOpen} onOpenChange={closeAddQuestion}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <PlusIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Add question</AlertDialogTitle>
            <AlertDialogDescription>
              Configure reverse-scored items for PSS and Likert-scale forms.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {addOpen ? (
            <form
              key="add-question"
              id="add-question-form"
              action={createAction}
              className="grid gap-4 sm:grid-cols-2"
            >
              <input
                type="hidden"
                name="questionnaire_id"
                value={questionnaire.questionnaire_id}
              />
              <QuestionFields idPrefix="add-" />
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={createPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="add-question-form"
              disabled={createPending}
            >
              {createPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Add question"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={editDialogOpen} onOpenChange={closeEditQuestion}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto data-[size=default]:max-w-lg data-[size=default]:sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <PencilIcon />
            </AlertDialogMedia>
            <AlertDialogTitle>Edit question</AlertDialogTitle>
            <AlertDialogDescription>
              Update text, scoring, order, and active status for this question.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {editing ? (
            <form
              key={editing.question_id}
              id="edit-question-form"
              action={updateAction}
              className="grid gap-4 sm:grid-cols-2"
            >
              <input
                type="hidden"
                name="questionnaire_id"
                value={questionnaire.questionnaire_id}
              />
              <input
                type="hidden"
                name="question_id"
                value={editing.question_id}
              />
              <QuestionFields
                question={editing}
                includeActive
                idPrefix="edit-"
              />
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="edit-question-form"
              disabled={updatePending || !editing}
            >
              {updatePending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(next) => {
          if (deletePending) return;
          closeDeleteQuestion(next);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete question?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting
                ? `This will permanently remove “${deleting.question_text}”. Questions with existing student answers cannot be deleted — deactivate them instead.`
                : "This will permanently remove the question."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleting ? (
            <form id="delete-question-form" action={deleteAction}>
              <input
                type="hidden"
                name="question_id"
                value={deleting.question_id}
              />
              <input
                type="hidden"
                name="questionnaire_id"
                value={questionnaire.questionnaire_id}
              />
            </form>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="submit"
              form="delete-question-form"
              variant="destructive"
              disabled={deletePending || !deleting}
            >
              {deletePending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2Icon />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
