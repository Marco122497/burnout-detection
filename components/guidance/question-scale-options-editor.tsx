"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, PlusIcon, RotateCcwIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cloneScaleOptions,
  getDefaultScaleOptions,
  type ScaleOption,
} from "@/lib/student/scale-options";

type QuestionScaleOptionsEditorProps = {
  options: ScaleOption[];
  onChange: (options: ScaleOption[]) => void;
  questionnaireName: string;
  responseType: string;
  questionOrder?: number;
  showNumericValue?: boolean;
};

function reindexOptions(options: ScaleOption[]): ScaleOption[] {
  return options.map((option, index) => ({
    ...option,
    value: index + 1,
  }));
}

export function QuestionScaleOptionsEditor({
  options,
  onChange,
  questionnaireName,
  responseType,
  questionOrder,
  showNumericValue = false,
}: QuestionScaleOptionsEditorProps) {
  const [resetting, setResetting] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const updateLabel = (index: number, label: string) => {
    const next = cloneScaleOptions(options);
    next[index] = { ...next[index], label };
    onChange(next);
  };

  const updateNumeric = (index: number, raw: string) => {
    const next = cloneScaleOptions(options);
    const trimmed = raw.trim();
    next[index] = {
      ...next[index],
      numeric_value:
        trimmed === "" ? undefined : Number.isFinite(Number(trimmed)) ? Number(trimmed) : undefined,
    };
    onChange(next);
  };

  const addOption = () => {
    if (options.length >= 12) return;
    onChange(
      reindexOptions([
        ...options,
        { value: options.length + 1, label: `Option ${options.length + 1}` },
      ])
    );
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    const next = cloneScaleOptions(options);
    next.splice(index, 1);
    onChange(reindexOptions(next));
  };

  const resetDefaults = () => {
    if (resetting) return;
    setResetting(true);
    onChange(
      getDefaultScaleOptions({
        questionnaireName,
        responseType: responseType as "Likert Scale" | "Number" | "Hours" | "Yes/No",
        questionOrder,
      })
    );
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setResetting(false);
      resetTimerRef.current = null;
    }, 350);
  };

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Label>Response choices</Label>
          <p className="text-xs text-muted-foreground">
            Labels shown to students. Values are numbered 1–{options.length} in order.
            {showNumericValue
              ? " Numeric value maps answers to MFBI scoring (e.g. estimated daily study hours)."
              : null}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetDefaults}
            disabled={resetting}
            aria-busy={resetting}
          >
            {resetting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RotateCcwIcon className="size-3.5" />
            )}
            {resetting ? "Resetting…" : "Reset defaults"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
            disabled={options.length >= 12}
          >
            <PlusIcon className="size-3.5" />
            Add choice
          </Button>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        {options.map((option, index) => (
          <div
            key={`scale-option-${index}`}
            className="grid gap-2 sm:grid-cols-[auto_1fr_auto_auto]"
          >
            <span className="flex h-9 w-8 items-center justify-center rounded-md bg-muted text-sm font-medium">
              {index + 1}
            </span>
            <Input
              value={option.label}
              onChange={(event) => updateLabel(index, event.target.value)}
              placeholder="Choice label"
              aria-label={`Choice ${index + 1} label`}
            />
            {showNumericValue ? (
              <Input
                type="number"
                step="any"
                min={0}
                value={option.numeric_value ?? ""}
                onChange={(event) => updateNumeric(index, event.target.value)}
                placeholder="Score"
                className="sm:w-28"
                aria-label={`Choice ${index + 1} numeric value`}
              />
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeOption(index)}
              disabled={options.length <= 2}
              aria-label={`Remove choice ${index + 1}`}
            >
              <Trash2Icon className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
