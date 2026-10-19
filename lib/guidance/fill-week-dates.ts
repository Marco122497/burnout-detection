import { toDateInputValue } from "@/lib/reports-range";

export type FillDateRange = {
  from: string;
  to: string;
};

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Monday 00:00 of the calendar week that contains `date`. Weeks run Monday–Sunday. */
export function mondayOfWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function fillDatePresets(now = new Date()) {
  const monday = mondayOfWeek(now);
  const nextMonday = addDays(monday, 7);
  return [
    {
      id: "this-mon-sun",
      label: "This week (Mon–Sun)",
      range: {
        from: toDateInputValue(monday),
        to: toDateInputValue(addDays(monday, 6)),
      },
    },
    {
      id: "this-mon-sat",
      label: "This week (Mon–Sat)",
      range: {
        from: toDateInputValue(monday),
        to: toDateInputValue(addDays(monday, 5)),
      },
    },
    {
      id: "next-mon-sat",
      label: "Next week (Mon–Sat)",
      range: {
        from: toDateInputValue(nextMonday),
        to: toDateInputValue(addDays(nextMonday, 5)),
      },
    },
  ] as const;
}

export function isFillDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Random time from the start of `from` through the end of `to`, in Philippine time. */
export function randomSubmittedAtInRange(from: string, to: string) {
  let start = from;
  let end = to;
  if (start > end) {
    const swap = start;
    start = end;
    end = swap;
  }
  const earliest = new Date(`${start}T00:00:00+08:00`).getTime();
  const latest = new Date(`${end}T23:59:59.999+08:00`).getTime();
  if (!Number.isFinite(earliest) || !Number.isFinite(latest) || latest < earliest) {
    return new Date().toISOString();
  }
  const offset = Math.floor(Math.random() * (latest - earliest + 1));
  return new Date(earliest + offset).toISOString();
}
