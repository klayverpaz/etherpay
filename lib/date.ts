import { format, parseISO } from "date-fns";

export function formatISODate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isoToBRDate(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy");
}

export function monthBoundsUTC(
  year: number,
  month: number,
): { start: string; endExclusive: string } {
  const start = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const endExclusive = `${nextYear.toString().padStart(4, "0")}-${nextMonth.toString().padStart(2, "0")}-01`;
  return { start, endExclusive };
}
