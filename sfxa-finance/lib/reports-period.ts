export function startOfPeriod(period: string) {
  const now = new Date();
  const start = new Date(now);

  if (period === "daily") {
    start.setHours(0, 0, 0, 0);
  } else if (period === "weekly") {
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    start.setHours(0, 0, 0, 0);
  } else if (period === "monthly") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (period === "annual") {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }

  return start.toISOString().slice(0, 10);
}
