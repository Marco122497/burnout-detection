import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats year level as "1st year", "2nd year", "3rd year", "4th year", etc. */
export function formatYearLevel(year: number) {
  const ordinals: Record<number, string> = {
    1: "1st",
    2: "2nd",
    3: "3rd",
    4: "4th",
  };
  return `${ordinals[year] ?? `${year}th`} year`;
}
