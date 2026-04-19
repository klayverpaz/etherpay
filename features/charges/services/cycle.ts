import type { CycleKind } from "@/features/clients/types";

function parseYMD(iso: string): { y: number; m: number; d: number } {
  const parts = iso.split("-");
  return {
    y: Number.parseInt(parts[0] ?? "0", 10),
    m: Number.parseInt(parts[1] ?? "0", 10),
    d: Number.parseInt(parts[2] ?? "0", 10),
  };
}

function formatYMD(y: number, m: number, d: number): string {
  return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

function lastDayOfMonthUTC(year: number, month1Indexed: number): number {
  return new Date(Date.UTC(year, month1Indexed, 0)).getUTCDate();
}

export function addCycle(
  anchorISO: string,
  kind: CycleKind,
  every: number,
  times: number,
): string {
  const { y, m, d } = parseYMD(anchorISO);

  if (kind === "days" || kind === "weeks") {
    const daysDelta = (kind === "weeks" ? 7 : 1) * every * times;
    const utc = new Date(Date.UTC(y, m - 1, d + daysDelta));
    return formatYMD(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
  }

  // months
  const totalMonths = (m - 1) + every * times;
  const targetYear = y + Math.floor(totalMonths / 12);
  const targetMonth0 = ((totalMonths % 12) + 12) % 12;
  const targetMonth1 = targetMonth0 + 1;
  const lastDay = lastDayOfMonthUTC(targetYear, targetMonth1);
  const targetDay = Math.min(d, lastDay);
  return formatYMD(targetYear, targetMonth1, targetDay);
}

const MAX_ITER = 10000;

export function nextNDueDates(args: {
  anchorDate: string;
  kind: CycleKind;
  every: number;
  endDate: string | null;
  todayISO: string;
  excludeDates: readonly string[];
  n: number;
}): string[] {
  const { anchorDate, kind, every, endDate, todayISO, excludeDates, n } = args;
  if (n <= 0) return [];

  const exclude = new Set(excludeDates);
  const result: string[] = [];

  for (let k = 0; k < MAX_ITER && result.length < n; k++) {
    const candidate = addCycle(anchorDate, kind, every, k);
    if (endDate && candidate > endDate) break;
    if (candidate < todayISO) continue;
    if (exclude.has(candidate)) continue;
    result.push(candidate);
  }

  return result;
}
