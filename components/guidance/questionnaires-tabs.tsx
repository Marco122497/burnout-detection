"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import {
  QuestionnaireDetailManager,
  displayQuestionnaireName,
  questionnaireListOrder,
} from "@/components/guidance/questionnaires-manager";
import type { QuestionRow, QuestionnaireRow } from "@/lib/guidance/questionnaires";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export function QuestionnairesTabs({
  items,
}: {
  items: {
    questionnaire: QuestionnaireRow;
    questions: QuestionRow[];
  }[];
}) {
  const searchParams = useSearchParams();
  const listRef = useRef<HTMLDivElement>(null);
  const ordered = [...items].sort(
    (a, b) =>
      questionnaireListOrder(a.questionnaire.questionnaire_name) -
      questionnaireListOrder(b.questionnaire.questionnaire_name)
  );
  const defaultValue =
    ordered[0] != null
      ? String(ordered[0].questionnaire.questionnaire_id)
      : "";
  const tabParam = searchParams.get("tab");
  const urlValue =
    tabParam &&
    ordered.some(
      (item) => String(item.questionnaire.questionnaire_id) === tabParam
    )
      ? tabParam
      : defaultValue;

  const [value, setValue] = useState(urlValue);

  useEffect(() => {
    setValue(urlValue);
  }, [urlValue]);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>(
      '[data-slot="tabs-trigger"][data-active]'
    );
    active?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [value]);

  if (ordered.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground">
            No questionnaires found. Seed questionnaires in the database first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (next == null) return;
        const nextValue = String(next);
        if (nextValue === value) return;
        setValue(nextValue);
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        if (params.get("tab") === nextValue) return;
        params.set("tab", nextValue);
        window.history.replaceState(
          null,
          "",
          `/guidance/questionnaires?${params.toString()}`
        );
      }}
      className="gap-4"
    >
      <div
        ref={listRef}
        className="-mx-1 overflow-x-auto px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <TabsList
          variant="line"
          className="h-9 w-max min-w-full flex-nowrap justify-start gap-0 border-b border-border/80 bg-transparent p-0"
        >
          {ordered.map(({ questionnaire }) => (
            <TabsTrigger
              key={questionnaire.questionnaire_id}
              value={String(questionnaire.questionnaire_id)}
              className="h-9 flex-none shrink-0 rounded-none px-3"
            >
              {displayQuestionnaireName(questionnaire.questionnaire_name)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {ordered.map(({ questionnaire, questions }) => (
        <TabsContent
          key={questionnaire.questionnaire_id}
          value={String(questionnaire.questionnaire_id)}
          className="mt-0 outline-none"
        >
          <QuestionnaireDetailManager
            questionnaire={questionnaire}
            questions={questions}
            embedded
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
