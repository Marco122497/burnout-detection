"use client";

import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function ScaleChoice({
  name,
  value,
  displayScore,
  label,
  required,
  disabled,
  onSelect,
}: {
  name: string;
  value: number;
  displayScore: number;
  label: string;
  required?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  return (
    <label
      className={cn(
        "student-chum-choice group relative flex min-h-12 cursor-pointer items-start gap-2.5 px-3.5 py-3 text-start text-sm select-none has-focus-visible:outline-none has-focus-visible:ring-3 has-focus-visible:ring-[color:var(--chum-green)]/35",
        disabled && "pointer-events-none cursor-not-allowed opacity-50"
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        required={required}
        disabled={disabled}
        onChange={onSelect}
        className="absolute inset-0 z-10 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        aria-label={`${displayScore} ${label}`}
      />
      <span
        aria-hidden="true"
        className="student-chum-choice-dot pointer-events-none relative flex size-4 shrink-0 translate-y-0.5 items-center justify-center rounded-full border"
      >
        <CheckIcon className="hidden size-3 group-has-[:checked]:block" />
      </span>
      <span className="pointer-events-none min-w-0 flex-1 font-semibold leading-snug">
        {displayScore} — {label}
      </span>
    </label>
  );
}
