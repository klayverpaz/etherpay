import { describe, expect, it } from "vitest";
import { formatISODate, isoToBRDate, monthBoundsUTC } from "@/lib/date";

describe("formatISODate", () => {
  it("formats a Date to YYYY-MM-DD (UTC)", () => {
    expect(formatISODate(new Date("2026-04-19T00:00:00.000Z"))).toBe("2026-04-19");
  });
});

describe("isoToBRDate", () => {
  it("renders an ISO date as DD/MM/YYYY", () => {
    expect(isoToBRDate("2026-04-19")).toBe("19/04/2026");
  });
});

describe("monthBoundsUTC", () => {
  it("returns first day of the month and first day of next month", () => {
    const { start, endExclusive } = monthBoundsUTC(2026, 4);
    expect(start).toBe("2026-04-01");
    expect(endExclusive).toBe("2026-05-01");
  });
  it("wraps from December to January of next year", () => {
    const { start, endExclusive } = monthBoundsUTC(2026, 12);
    expect(start).toBe("2026-12-01");
    expect(endExclusive).toBe("2027-01-01");
  });
});
