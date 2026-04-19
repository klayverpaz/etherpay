import { describe, expect, it } from "vitest";
import { addCycle, nextNDueDates } from "@/features/charges/services/cycle";

describe("addCycle — days", () => {
  it("adds days with every=1", () => {
    expect(addCycle("2026-04-19", "days", 1, 3)).toBe("2026-04-22");
  });
  it("adds days with every=7", () => {
    expect(addCycle("2026-04-19", "days", 7, 2)).toBe("2026-05-03");
  });
  it("returns anchor when times=0", () => {
    expect(addCycle("2026-04-19", "days", 5, 0)).toBe("2026-04-19");
  });
});

describe("addCycle — weeks", () => {
  it("adds weeks with every=1", () => {
    expect(addCycle("2026-04-19", "weeks", 1, 4)).toBe("2026-05-17");
  });
  it("adds weeks with every=2", () => {
    expect(addCycle("2026-04-19", "weeks", 2, 3)).toBe("2026-05-31");
  });
});

describe("addCycle — months", () => {
  it("adds months with every=1", () => {
    expect(addCycle("2026-04-19", "months", 1, 2)).toBe("2026-06-19");
  });
  it("crosses year boundary", () => {
    expect(addCycle("2026-11-15", "months", 1, 3)).toBe("2027-02-15");
  });
  it("clamps day 31 to last day of shorter month", () => {
    expect(addCycle("2026-01-31", "months", 1, 1)).toBe("2026-02-28");
    expect(addCycle("2026-01-31", "months", 1, 2)).toBe("2026-03-31");
  });
  it("clamps day 31 to last day of a leap February", () => {
    expect(addCycle("2028-01-31", "months", 1, 1)).toBe("2028-02-29");
  });
  it("handles quarterly (every=3)", () => {
    expect(addCycle("2026-04-19", "months", 3, 2)).toBe("2026-10-19");
  });
});

describe("nextNDueDates", () => {
  it("returns [] when n is 0", () => {
    expect(
      nextNDueDates({
        anchorDate: "2026-04-19",
        kind: "months",
        every: 1,
        endDate: null,
        todayISO: "2026-04-19",
        excludeDates: [],
        n: 0,
      }),
    ).toEqual([]);
  });

  it("generates N monthly dates starting at anchor when anchor == today", () => {
    expect(
      nextNDueDates({
        anchorDate: "2026-04-19",
        kind: "months",
        every: 1,
        endDate: null,
        todayISO: "2026-04-19",
        excludeDates: [],
        n: 3,
      }),
    ).toEqual(["2026-04-19", "2026-05-19", "2026-06-19"]);
  });

  it("skips past anchor dates that are before today", () => {
    expect(
      nextNDueDates({
        anchorDate: "2026-01-15",
        kind: "months",
        every: 1,
        endDate: null,
        todayISO: "2026-04-19",
        excludeDates: [],
        n: 3,
      }),
    ).toEqual(["2026-05-15", "2026-06-15", "2026-07-15"]);
  });

  it("excludes dates that already exist", () => {
    expect(
      nextNDueDates({
        anchorDate: "2026-04-19",
        kind: "months",
        every: 1,
        endDate: null,
        todayISO: "2026-04-19",
        excludeDates: ["2026-04-19", "2026-06-19"],
        n: 3,
      }),
    ).toEqual(["2026-05-19", "2026-07-19", "2026-08-19"]);
  });

  it("truncates at cycle.endDate inclusive", () => {
    expect(
      nextNDueDates({
        anchorDate: "2026-04-19",
        kind: "months",
        every: 1,
        endDate: "2026-06-19",
        todayISO: "2026-04-19",
        excludeDates: [],
        n: 5,
      }),
    ).toEqual(["2026-04-19", "2026-05-19", "2026-06-19"]);
  });

  it("returns empty when endDate is before today", () => {
    expect(
      nextNDueDates({
        anchorDate: "2025-01-01",
        kind: "months",
        every: 1,
        endDate: "2025-12-31",
        todayISO: "2026-04-19",
        excludeDates: [],
        n: 3,
      }),
    ).toEqual([]);
  });

  it("works with weekly cycles", () => {
    expect(
      nextNDueDates({
        anchorDate: "2026-04-19",
        kind: "weeks",
        every: 1,
        endDate: null,
        todayISO: "2026-04-19",
        excludeDates: [],
        n: 3,
      }),
    ).toEqual(["2026-04-19", "2026-04-26", "2026-05-03"]);
  });

  it("works with day-31 anchors across months with varying lengths", () => {
    expect(
      nextNDueDates({
        anchorDate: "2026-01-31",
        kind: "months",
        every: 1,
        endDate: null,
        todayISO: "2026-01-31",
        excludeDates: [],
        n: 4,
      }),
    ).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });
});
