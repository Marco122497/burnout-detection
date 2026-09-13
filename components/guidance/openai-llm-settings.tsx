"use client";

import { useActionState } from "react";
import { Loader2, SparklesIcon } from "lucide-react";

import {
  updateOpenaiLlmEnabled,
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

export function OpenaiLlmSettings({ enabled }: { enabled: boolean }) {
  const [state, action, pending] = useActionState(
    updateOpenaiLlmEnabled,
    initialState
  );
  useActionToast(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <SparklesIcon className="size-4" />
          OpenAI LLM
        </CardTitle>
        <CardDescription>
          Turn off GPT wording for student recommendations. RAG retrieval still
          runs. MFBI and machine-learning risk are never changed by this switch.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex items-center justify-between gap-4">
          <input
            type="hidden"
            name="openai_llm_enabled"
            value={enabled ? "false" : "true"}
          />
          <div className="space-y-1">
            <Label htmlFor="openai-llm-toggle">Use OpenAI after RAG</Label>
            <p className="text-sm text-muted-foreground">
              {enabled
                ? "On. gpt-4o-mini writes the advice from retrieved knowledge."
                : "Off. Students get retrieved knowledge in template wording."}
            </p>
          </div>
          <button
            id="openai-llm-toggle"
            type="submit"
            role="switch"
            aria-checked={enabled}
            disabled={pending}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
              enabled ? "bg-primary" : "bg-input"
            )}
          >
            {pending ? (
              <Loader2 className="mx-auto size-3.5 animate-spin text-primary-foreground" />
            ) : (
              <span
                className={cn(
                  "pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform",
                  enabled ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            )}
            <span className="sr-only">
              {enabled ? "Turn off OpenAI LLM" : "Turn on OpenAI LLM"}
            </span>
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
