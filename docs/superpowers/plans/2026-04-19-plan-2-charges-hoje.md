# EtherPay Plan 2 — Charges, Cycle Engine, and the Hoje Dashboard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Clientes app delivered by Plan 1 into a working recurring-billing tool: every non-archived client automatically materializes 3 upcoming charges; the Hoje dashboard shows today + overdue at a glance with totals; the operator can mark charges as paid, optionally cancel them, and edit amount/notes on the charge detail page.

**Architecture:** Pure-function domain services (`features/charges/services/cycle.ts`, `features/charges/services/classify.ts`) handle all date math and classification, unit-tested with Vitest using UTC-safe helpers. Server actions in `features/charges/actions.ts` wrap a thin validation layer around Supabase writes and call a shared `topUpClientCharges` routine so the rolling window stays at 3 after every mutation. The Hoje page is a server component that runs `topUpAllClients()` once per render, then queries today's and overdue charges with a join on `clients` for display.

**Tech Stack (already pinned by Plan 1):** Next.js 14 (App Router), TypeScript strict, pnpm, Tailwind CSS + shadcn/ui v2.1.8 (Radix), Supabase (Postgres + Auth), `@supabase/ssr`, `react-hook-form` + `zod` v4 (use `standardSchemaResolver`, not `zodResolver`), `date-fns`, Vitest, Playwright.

**Reference spec:** `docs/superpowers/specs/2026-04-19-etherpay-design.md` — §4 feature set, §6.2 `charges` table, §6.5 rolling window, §7.1 Hoje page, §7.2 cobrança detail, §7.3 key interactions, §8.3 domain services.

**Build on Plan 1:** `docs/superpowers/plans/2026-04-19-plan-1-foundation.md` — schema and RLS for `charges` already applied; `handle_new_user` seeds a default `settings` row; generated types live at `lib/supabase/types.ts`; `lib/uuid.ts`, `lib/money.ts`, `lib/date.ts` are already in place. Do NOT reintroduce packages that were installed in Plan 1.

## Scope of Plan 2

- Pure-function services: `cycle.ts` (UTC-safe `addCycle`, `nextNDueDates`) and `classify.ts` (today vs. overdue split).
- Charges domain types + read queries (Hoje list, client charge history, single charge with client info).
- `topUpClientCharges(clientId)` server action that brings any client's pending-upcoming count back to 3 (idempotent).
- `topUpAllClients()` helper invoked on Hoje render.
- Wire `topUpClientCharges` into `createClientAction` and `updateClientAction` so the window materializes immediately on create.
- Charge mutations: `markPaidAction`, `cancelChargeAction`, `updateChargeAction` (amount + notes).
- Hoje dashboard page (`/hoje`) with banner totals and two grouped lists ("Em atraso", "Hoje") and a one-tap **Marcar pago** row action.
- Charge detail page (`/cobrancas/[id]`) with editable amount and notes (pending charges only), status pill, mark-paid button, link back to the client.
- Top-bar navigation links for Hoje + Clientes; redirect signed-in users to `/hoje` instead of `/clientes`.
- One Playwright E2E proving: create client → 3 pending charges materialize → first charge appears on Hoje → mark paid → new 3rd charge materializes to replace it.

## Not in Plan 2 (covered by later plans)

- `Notificar pelo Whatsapp` button (template fill + `wa.me` open) — Plan 3.
- Attachments (per-charge receipts) — Plan 3.
- Reports (monthly totals) — Plan 3.
- Settings UI (message template editor, reminder toggle) — Plan 3.
- Daily reminder email, PWA, i18n wiring, feature-gate UI, Cloudflare Pages deployment, `docs/setup-guide.md` — Plan 4.
- "Nova cobrança avulsa" one-off charge creation on client detail — deferred; the rolling window is enough for v1's golden path.
- Mobile bottom-tab + desktop side-nav redesign — deferred to Plan 3 when the 4th tab (Ajustes) is introduced; Plan 2 adds links to the existing top bar.

## Conventions used throughout

- Commit messages follow Conventional Commits (`feat:`, `test:`, `chore:`, `docs:`, `refactor:`). Each task ends with a commit — do NOT batch commits across tasks.
- TDD is rigid for pure-function services: write the failing test, run it, implement, run again, commit. Do not skip the "run and see failure" step.
- Every code block in this plan is the literal content for the file — no placeholders, no "similar to above."
- After any file change, `pnpm typecheck` before committing. If it fails, fix before committing.
- When a step says "Expected: X" and you see something else, stop and investigate. Do not proceed with red tests.
- IDs are client/server-generated UUID v4 via `newId()` from `@/lib/uuid`. Charges inserted server-side call `newId()` too.
- Money is `BIGINT` cents. Dates (`DATE` columns) are ISO strings `"YYYY-MM-DD"` round-tripped as strings — do NOT convert to `Date` at the boundary. Timestamps (`TIMESTAMPTZ`) are ISO strings with timezone.
- Soft delete is the default. For charges, "cancel" sets `status='canceled'` (not `deleted_at`). `deleted_at` is reserved for hard-deletion-via-soft-delete which is not exposed to the UI in v1.

---

## Phase 1 — Pure-function domain services (TDD)

### Task 1: Charges domain types

**Files:**

- Create: `features/charges/types.ts`

- [ ] **Step 1: Create the types file**

Create `features/charges/types.ts`:

```typescript
import type { CycleKind } from "@/features/clients/types";

export type ChargeStatus = "pending" | "paid" | "canceled";

export type PaymentMethod = "pix" | "cash" | "transfer" | "other";

export interface Charge {
  id: string;
  owner_id: string;
  client_id: string;
  due_date: string; // ISO date "YYYY-MM-DD"
  amount_cents: number;
  status: ChargeStatus;
  paid_at: string | null;
  paid_amount_cents: number | null;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ChargeWithClient extends Charge {
  client: {
    id: string;
    name: string;
    phone_e164: string | null;
  };
}

export interface CycleRule {
  kind: CycleKind;
  every: number;
  anchorDate: string;
  endDate: string | null;
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add features/charges/types.ts
git commit -m "feat(charges): domain types"
```

---

### Task 2: `features/charges/services/cycle.ts` — UTC-safe date math + next-N due dates

**Files:**

- Create: `features/charges/services/cycle.ts`, `tests/unit/features/charges/services/cycle.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/features/charges/services/cycle.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the test, confirm it fails**

```bash
pnpm test tests/unit/features/charges/services/cycle.test.ts
```

Expected: fails with "Cannot find module '@/features/charges/services/cycle'".

- [ ] **Step 3: Implement the service with UTC-safe date math**

Create `features/charges/services/cycle.ts`:

```typescript
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

export function addCycle(anchorISO: string, kind: CycleKind, every: number, times: number): string {
  const { y, m, d } = parseYMD(anchorISO);

  if (kind === "days" || kind === "weeks") {
    const daysDelta = (kind === "weeks" ? 7 : 1) * every * times;
    const utc = new Date(Date.UTC(y, m - 1, d + daysDelta));
    return formatYMD(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
  }

  // months
  const totalMonths = m - 1 + every * times;
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
```

- [ ] **Step 4: Run the test, confirm it passes**

```bash
pnpm test tests/unit/features/charges/services/cycle.test.ts
```

Expected: all tests pass (3 `addCycle` suites + 1 `nextNDueDates` suite, 17 tests total).

- [ ] **Step 5: Commit**

```bash
git add features/charges/services/cycle.ts tests/unit/features/charges/services/cycle.test.ts
git commit -m "feat(charges): cycle service with utc-safe next-n due dates"
```

---

### Task 3: `features/charges/services/classify.ts` — today vs. overdue split

**Files:**

- Create: `features/charges/services/classify.ts`, `tests/unit/features/charges/services/classify.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/features/charges/services/classify.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { classifyToday } from "@/features/charges/services/classify";
import type { Charge } from "@/features/charges/types";

function c(partial: Partial<Charge> & { due_date: string; status: Charge["status"] }): Charge {
  return {
    id: "id",
    owner_id: "o",
    client_id: "c",
    amount_cents: 0,
    paid_at: null,
    paid_amount_cents: null,
    payment_method: null,
    notes: null,
    created_at: "2026-04-19T00:00:00Z",
    updated_at: "2026-04-19T00:00:00Z",
    deleted_at: null,
    ...partial,
  };
}

describe("classifyToday", () => {
  const today = "2026-04-19";

  it("splits pending charges into today and overdue buckets", () => {
    const charges = [
      c({ id: "1", due_date: "2026-04-19", status: "pending" }),
      c({ id: "2", due_date: "2026-04-01", status: "pending" }),
      c({ id: "3", due_date: "2026-04-18", status: "pending" }),
      c({ id: "4", due_date: "2026-04-20", status: "pending" }), // upcoming — excluded
    ];
    const result = classifyToday(charges, today);
    expect(result.today.map((x) => x.id)).toEqual(["1"]);
    // overdue is sorted oldest-first: id=2 (2026-04-01) before id=3 (2026-04-18).
    expect(result.overdue.map((x) => x.id)).toEqual(["2", "3"]);
  });

  it("excludes paid and canceled charges from both buckets", () => {
    const charges = [
      c({ id: "1", due_date: "2026-04-19", status: "paid" }),
      c({ id: "2", due_date: "2026-04-18", status: "canceled" }),
      c({ id: "3", due_date: "2026-04-19", status: "pending" }),
    ];
    const result = classifyToday(charges, today);
    expect(result.today.map((x) => x.id)).toEqual(["3"]);
    expect(result.overdue).toEqual([]);
  });

  it("sorts overdue oldest-first and today by id for stability", () => {
    const charges = [
      c({ id: "b", due_date: "2026-04-19", status: "pending" }),
      c({ id: "a", due_date: "2026-04-19", status: "pending" }),
      c({ id: "x", due_date: "2026-04-01", status: "pending" }),
      c({ id: "y", due_date: "2026-04-15", status: "pending" }),
    ];
    const result = classifyToday(charges, today);
    expect(result.overdue.map((x) => x.due_date)).toEqual(["2026-04-01", "2026-04-15"]);
    expect(result.today.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("returns empty arrays when no pending charges match", () => {
    const result = classifyToday([], today);
    expect(result).toEqual({ today: [], overdue: [] });
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

```bash
pnpm test tests/unit/features/charges/services/classify.test.ts
```

Expected: fails with "Cannot find module".

- [ ] **Step 3: Implement the classifier**

Create `features/charges/services/classify.ts`:

```typescript
import type { Charge } from "@/features/charges/types";

export function classifyToday<T extends Charge>(
  charges: readonly T[],
  todayISO: string,
): { today: T[]; overdue: T[] } {
  const pending = charges.filter((c) => c.status === "pending");

  const todayBucket = pending
    .filter((c) => c.due_date === todayISO)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));

  const overdueBucket = pending
    .filter((c) => c.due_date < todayISO)
    .slice()
    .sort((a, b) =>
      a.due_date === b.due_date ? a.id.localeCompare(b.id) : a.due_date.localeCompare(b.due_date),
    );

  return { today: todayBucket, overdue: overdueBucket };
}
```

- [ ] **Step 4: Run the test, confirm it passes**

```bash
pnpm test tests/unit/features/charges/services/classify.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add features/charges/services/classify.ts tests/unit/features/charges/services/classify.test.ts
git commit -m "feat(charges): classify today vs overdue"
```

---

## Phase 2 — Queries and schema

### Task 4: Charge input schemas (zod)

**Files:**

- Create: `features/charges/schema.ts`

- [ ] **Step 1: Create the schema file**

Create `features/charges/schema.ts`:

```typescript
import { z } from "zod";

export const paymentMethod = z.enum(["pix", "cash", "transfer", "other"]);

export const markPaidInputSchema = z.object({
  charge_id: z.string().uuid(),
  paid_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paid_amount_cents: z.number().int().nonnegative(),
  payment_method: paymentMethod,
});

export type MarkPaidInput = z.infer<typeof markPaidInputSchema>;

export const updateChargeInputSchema = z.object({
  charge_id: z.string().uuid(),
  amount_cents: z.number().int().nonnegative(),
  notes: z
    .string()
    .max(2000)
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export type UpdateChargeInput = z.infer<typeof updateChargeInputSchema>;
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add features/charges/schema.ts
git commit -m "feat(charges): input schemas"
```

---

### Task 5: Charges queries

**Files:**

- Create: `features/charges/queries.ts`

- [ ] **Step 1: Create queries**

Create `features/charges/queries.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import type { Charge, ChargeWithClient } from "./types";

/**
 * All non-deleted charges for a single client, any status.
 * Used by topUpClientCharges to compute exclude-dates.
 */
export async function listChargesForClient(clientId: string): Promise<Charge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("charges")
    .select("*")
    .eq("client_id", clientId)
    .is("deleted_at", null)
    .order("due_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Charge[];
}

/**
 * Pending charges with due_date <= today, joined with client name + phone.
 * The classifyToday service splits these into today/overdue buckets.
 */
export async function listTodayAndOverdueCharges(todayISO: string): Promise<ChargeWithClient[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("charges")
    .select("*, client:clients!inner(id, name, phone_e164)")
    .eq("status", "pending")
    .lte("due_date", todayISO)
    .is("deleted_at", null)
    .order("due_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ChargeWithClient[];
}

export async function getChargeWithClient(id: string): Promise<ChargeWithClient | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("charges")
    .select("*, client:clients!inner(id, name, phone_e164)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as unknown as ChargeWithClient | null) ?? null;
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add features/charges/queries.ts
git commit -m "feat(charges): queries for hoje dashboard and detail"
```

---

## Phase 3 — Rolling window engine

### Task 6: `topUpClientCharges` server action

**Files:**

- Create: `features/charges/actions.ts`

- [ ] **Step 1: Create the file with the top-up action**

Create `features/charges/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabase } from "@/lib/supabase/server";
import { newId } from "@/lib/uuid";
import { formatISODate } from "@/lib/date";
import { nextNDueDates } from "./services/cycle";
import type { CycleKind } from "@/features/clients/types";

const ROLLING_WINDOW_TARGET = 3;

type ClientForTopUp = {
  id: string;
  owner_id: string;
  default_amount_cents: number;
  cycle_kind: CycleKind;
  cycle_every: number;
  cycle_anchor_date: string;
  cycle_end_date: string | null;
};

function getTodayISO(): string {
  return formatISODate(new Date());
}

/**
 * Ensure the client has at least ROLLING_WINDOW_TARGET pending charges with
 * due_date >= today. Idempotent: safe to call multiple times.
 * Returns the number of charges inserted.
 */
export async function topUpClientCharges(clientId: string): Promise<number> {
  const supabase = createSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: clientRow, error: clientErr } = await supabase
    .from("clients")
    .select(
      "id, owner_id, default_amount_cents, cycle_kind, cycle_every, cycle_anchor_date, cycle_end_date, archived_at, deleted_at",
    )
    .eq("id", clientId)
    .maybeSingle();
  if (clientErr) throw new Error(clientErr.message);
  if (!clientRow) return 0;
  if (clientRow.archived_at || clientRow.deleted_at) return 0;

  const client: ClientForTopUp = {
    id: clientRow.id,
    owner_id: clientRow.owner_id,
    default_amount_cents: clientRow.default_amount_cents,
    cycle_kind: clientRow.cycle_kind,
    cycle_every: clientRow.cycle_every,
    cycle_anchor_date: clientRow.cycle_anchor_date,
    cycle_end_date: clientRow.cycle_end_date,
  };

  const todayISO = getTodayISO();

  const { data: existingRows, error: existingErr } = await supabase
    .from("charges")
    .select("due_date, status")
    .eq("client_id", client.id)
    .is("deleted_at", null);
  if (existingErr) throw new Error(existingErr.message);

  const allExistingDates = (existingRows ?? []).map((r) => r.due_date);
  const pendingUpcomingCount = (existingRows ?? []).filter(
    (r) => r.status === "pending" && r.due_date >= todayISO,
  ).length;

  const needed = Math.max(0, ROLLING_WINDOW_TARGET - pendingUpcomingCount);
  if (needed === 0) return 0;

  const datesToInsert = nextNDueDates({
    anchorDate: client.cycle_anchor_date,
    kind: client.cycle_kind,
    every: client.cycle_every,
    endDate: client.cycle_end_date,
    todayISO,
    excludeDates: allExistingDates,
    n: needed,
  });

  if (datesToInsert.length === 0) return 0;

  const rows = datesToInsert.map((due_date) => ({
    id: newId(),
    owner_id: client.owner_id,
    client_id: client.id,
    due_date,
    amount_cents: client.default_amount_cents,
    status: "pending" as const,
  }));

  const { error: insertErr } = await supabase.from("charges").insert(rows);
  if (insertErr) throw new Error(insertErr.message);

  return rows.length;
}

/**
 * Top up every non-archived client. Called on /hoje render so the window
 * stays fresh even if a prior mutation didn't top up (e.g. archived then
 * un-archived, or an old account first logging in after v2 upgrade).
 */
export async function topUpAllClients(): Promise<number> {
  const supabase = createSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .is("deleted_at", null)
    .is("archived_at", null);
  if (error) throw new Error(error.message);

  let total = 0;
  for (const row of data ?? []) {
    total += await topUpClientCharges(row.id);
  }
  if (total > 0) revalidatePath("/hoje");
  return total;
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add features/charges/actions.ts
git commit -m "feat(charges): rolling-window top-up action"
```

---

### Task 7: Wire top-up into client create + update

**Files:**

- Modify: `features/clients/actions.ts`

- [ ] **Step 1: Read the current file**

Read `features/clients/actions.ts` to confirm shape. It currently defines `createClientAction`, `updateClientAction`, and `archiveClientAction`.

- [ ] **Step 2: Replace `features/clients/actions.ts`**

Replace the entire content of `features/clients/actions.ts` with:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabase } from "@/lib/supabase/server";
import { newId } from "@/lib/uuid";
import { topUpClientCharges } from "@/features/charges/actions";
import { clientInputSchema, type ClientInput } from "./schema";

export async function createClientAction(input: ClientInput) {
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const id = newId();
  const { error } = await supabase.from("clients").insert({
    id,
    owner_id: user.id,
    ...parsed.data,
  });
  if (error) return { error: error.message };

  await topUpClientCharges(id);

  revalidatePath("/clientes");
  revalidatePath("/hoje");
  redirect(`/clientes/${id}`);
}

export async function updateClientAction(id: string, input: ClientInput) {
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = createSupabase();
  const { error } = await supabase.from("clients").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };

  await topUpClientCharges(id);

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  revalidatePath("/hoje");
  return { success: true };
}

export async function archiveClientAction(id: string) {
  const supabase = createSupabase();
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clientes");
  revalidatePath("/hoje");
  redirect("/clientes");
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add features/clients/actions.ts
git commit -m "feat(clients): top up charges after create and update"
```

---

## Phase 4 — Charge mutations

### Task 8: `markPaidAction`, `cancelChargeAction`, `updateChargeAction`

**Files:**

- Modify: `features/charges/actions.ts`

- [ ] **Step 1: Add the schema import at the top**

Open `features/charges/actions.ts`. Immediately after the existing import line:

```typescript
import type { CycleKind } from "@/features/clients/types";
```

Add:

```typescript
import { markPaidInputSchema, updateChargeInputSchema } from "./schema";
```

- [ ] **Step 2: Append the three mutation actions**

At the end of `features/charges/actions.ts` (after the existing `topUpAllClients` function), append:

```typescript
export async function markPaidAction(input: unknown) {
  const parsed = markPaidInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = createSupabase();

  const { data: chargeRow, error: readErr } = await supabase
    .from("charges")
    .select("client_id, status")
    .eq("id", parsed.data.charge_id)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!chargeRow) return { error: "Cobrança não encontrada." };
  if (chargeRow.status !== "pending") return { error: "Cobrança já processada." };

  const { error: updateErr } = await supabase
    .from("charges")
    .update({
      status: "paid",
      paid_at: `${parsed.data.paid_date}T12:00:00+00:00`,
      paid_amount_cents: parsed.data.paid_amount_cents,
      payment_method: parsed.data.payment_method,
    })
    .eq("id", parsed.data.charge_id);
  if (updateErr) return { error: updateErr.message };

  await topUpClientCharges(chargeRow.client_id);

  revalidatePath("/hoje");
  revalidatePath(`/cobrancas/${parsed.data.charge_id}`);
  revalidatePath(`/clientes/${chargeRow.client_id}`);
  return { success: true };
}

export async function cancelChargeAction(chargeId: string) {
  const supabase = createSupabase();

  const { data: chargeRow, error: readErr } = await supabase
    .from("charges")
    .select("client_id, status")
    .eq("id", chargeId)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!chargeRow) return { error: "Cobrança não encontrada." };
  if (chargeRow.status !== "pending") return { error: "Cobrança já processada." };

  const { error: updateErr } = await supabase
    .from("charges")
    .update({ status: "canceled" })
    .eq("id", chargeId);
  if (updateErr) return { error: updateErr.message };

  await topUpClientCharges(chargeRow.client_id);

  revalidatePath("/hoje");
  revalidatePath(`/cobrancas/${chargeId}`);
  revalidatePath(`/clientes/${chargeRow.client_id}`);
  return { success: true };
}

export async function updateChargeAction(input: unknown) {
  const parsed = updateChargeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = createSupabase();

  const { data: chargeRow, error: readErr } = await supabase
    .from("charges")
    .select("client_id, status")
    .eq("id", parsed.data.charge_id)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!chargeRow) return { error: "Cobrança não encontrada." };
  if (chargeRow.status !== "pending")
    return { error: "Apenas cobranças pendentes podem ser editadas." };

  const { error: updateErr } = await supabase
    .from("charges")
    .update({
      amount_cents: parsed.data.amount_cents,
      notes: parsed.data.notes,
    })
    .eq("id", parsed.data.charge_id);
  if (updateErr) return { error: updateErr.message };

  revalidatePath("/hoje");
  revalidatePath(`/cobrancas/${parsed.data.charge_id}`);
  revalidatePath(`/clientes/${chargeRow.client_id}`);
  return { success: true };
}
```

- [ ] **Step 3: Verify the final imports block**

Confirm that the top of `features/charges/actions.ts` reads exactly:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabase } from "@/lib/supabase/server";
import { newId } from "@/lib/uuid";
import { formatISODate } from "@/lib/date";
import { nextNDueDates } from "./services/cycle";
import type { CycleKind } from "@/features/clients/types";
import { markPaidInputSchema, updateChargeInputSchema } from "./schema";
```

- [ ] **Step 4: Typecheck and commit**

```bash
pnpm typecheck
git add features/charges/actions.ts
git commit -m "feat(charges): mark-paid, cancel, and update actions"
```

---

## Phase 5 — Hoje dashboard

### Task 9: `ChargeRow` component

**Files:**

- Create: `components/ChargeRow.tsx`

- [ ] **Step 1: Create the component**

Create `components/ChargeRow.tsx`:

```tsx
import Link from "next/link";
import { formatBRL } from "@/lib/money";
import { isoToBRDate } from "@/lib/date";
import type { ChargeWithClient } from "@/features/charges/types";

type Props = {
  charge: ChargeWithClient;
  tone: "today" | "overdue";
  action?: React.ReactNode;
};

export function ChargeRow({ charge, tone, action }: Props) {
  const borderTone = tone === "overdue" ? "border-destructive/40" : "border-border";

  return (
    <div className={`flex items-center justify-between rounded-md border ${borderTone} p-3`}>
      <Link href={`/cobrancas/${charge.id}`} className="flex-1 pr-3">
        <div className="font-medium">{charge.client.name}</div>
        <div className="text-xs text-muted-foreground">Vence em {isoToBRDate(charge.due_date)}</div>
      </Link>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="font-semibold">{formatBRL(charge.amount_cents)}</div>
        </div>
        {action}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add components/ChargeRow.tsx
git commit -m "feat(charges): charge-row component"
```

---

### Task 10: `MarkPaidDialog` client component

**Files:**

- Create: `components/MarkPaidDialog.tsx`

- [ ] **Step 1: Create the dialog**

Create `components/MarkPaidDialog.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { brlToCents, formatBRL } from "@/lib/money";
import { formatISODate } from "@/lib/date";
import { markPaidAction } from "@/features/charges/actions";
import type { PaymentMethod } from "@/features/charges/types";

type Props = {
  chargeId: string;
  defaultAmountCents: number;
  trigger: React.ReactNode;
};

export function MarkPaidDialog({ chargeId, defaultAmountCents, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [paidDate, setPaidDate] = useState(formatISODate(new Date()));
  const [amountDisplay, setAmountDisplay] = useState(formatBRL(defaultAmountCents));
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cents = brlToCents(amountDisplay);
    if (cents === null) {
      toast.error("Valor inválido.");
      return;
    }
    startTransition(async () => {
      const result = await markPaidAction({
        charge_id: chargeId,
        paid_date: paidDate,
        paid_amount_cents: cents,
        payment_method: method,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Cobrança marcada como paga.");
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como pago</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paid_date">Data do pagamento</Label>
            <Input
              id="paid_date"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paid_amount">Valor recebido</Label>
            <Input
              id="paid_amount"
              value={amountDisplay}
              onChange={(e) => setAmountDisplay(e.target.value)}
              placeholder="R$ 150,00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Forma de pagamento</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add components/MarkPaidDialog.tsx
git commit -m "feat(charges): mark-paid dialog"
```

---

### Task 11: Hoje dashboard page

**Files:**

- Create: `app/(app)/hoje/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/(app)/hoje/page.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChargeRow } from "@/components/ChargeRow";
import { EmptyState } from "@/components/EmptyState";
import { MarkPaidDialog } from "@/components/MarkPaidDialog";
import { formatBRL } from "@/lib/money";
import { formatISODate, isoToBRDate } from "@/lib/date";
import { listTodayAndOverdueCharges } from "@/features/charges/queries";
import { classifyToday } from "@/features/charges/services/classify";
import { topUpAllClients } from "@/features/charges/actions";

export const dynamic = "force-dynamic";

export default async function HojePage() {
  await topUpAllClients();

  const todayISO = formatISODate(new Date());
  const rows = await listTodayAndOverdueCharges(todayISO);
  const { today, overdue } = classifyToday(rows, todayISO);

  const todayTotal = today.reduce((s, c) => s + c.amount_cents, 0);
  const overdueTotal = overdue.reduce((s, c) => s + c.amount_cents, 0);

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Hoje</h1>
        <p className="text-sm text-muted-foreground">{isoToBRDate(todayISO)}</p>
      </header>

      <div className="rounded-md border p-4">
        <div className="text-sm text-muted-foreground">A receber hoje</div>
        <div className="text-2xl font-semibold">{formatBRL(todayTotal)}</div>
        <div className="text-xs text-muted-foreground">
          {today.length} {today.length === 1 ? "cobrança" : "cobranças"}
        </div>
        {overdue.length > 0 && (
          <div className="mt-3 border-t pt-3 text-sm text-destructive">
            Em atraso: {formatBRL(overdueTotal)} ({overdue.length}{" "}
            {overdue.length === 1 ? "cobrança" : "cobranças"})
          </div>
        )}
      </div>

      {overdue.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Em atraso</h2>
          {overdue.map((charge) => (
            <ChargeRow
              key={charge.id}
              charge={charge}
              tone="overdue"
              action={
                <MarkPaidDialog
                  chargeId={charge.id}
                  defaultAmountCents={charge.amount_cents}
                  trigger={
                    <Button size="sm" variant="outline">
                      Pago
                    </Button>
                  }
                />
              }
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Hoje</h2>
        {today.length === 0 && overdue.length === 0 ? (
          <EmptyState
            title="Nada para hoje"
            description="Quando uma cobrança vencer, ela aparece aqui."
            action={
              <Button asChild variant="outline">
                <Link href="/clientes">Ver clientes</Link>
              </Button>
            }
          />
        ) : today.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma cobrança vence hoje.</p>
        ) : (
          today.map((charge) => (
            <ChargeRow
              key={charge.id}
              charge={charge}
              tone="today"
              action={
                <MarkPaidDialog
                  chargeId={charge.id}
                  defaultAmountCents={charge.amount_cents}
                  trigger={
                    <Button size="sm" variant="outline">
                      Pago
                    </Button>
                  }
                />
              }
            />
          ))
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add "app/(app)/hoje"
git commit -m "feat(hoje): dashboard with banner and mark-paid rows"
```

---

### Task 12: Update TopBar with nav links + redirect to `/hoje`

**Files:**

- Modify: `components/TopBar.tsx`, `lib/supabase/middleware.ts`, `app/page.tsx`, `app/(auth)/sign-in/actions.ts`

- [ ] **Step 1: Replace TopBar**

Replace `components/TopBar.tsx` with:

```tsx
import Link from "next/link";
import { signOut } from "@/app/(app)/actions/sign-out";
import { Button } from "@/components/ui/button";

export function TopBar({ email }: { email: string }) {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-6">
        <span className="font-semibold">EtherPay</span>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/hoje" className="text-foreground hover:underline">
            Hoje
          </Link>
          <Link href="/clientes" className="text-foreground hover:underline">
            Clientes
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
        <form action={signOut}>
          <Button variant="ghost" type="submit" size="sm">
            Sair
          </Button>
        </form>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Redirect signed-in traffic to `/hoje`**

Modify `app/page.tsx` — replace the redirect target:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/hoje" : "/sign-in");
}
```

Modify `lib/supabase/middleware.ts` — change the post-auth redirect from `/clientes` to `/hoje`. Locate the line:

```typescript
if (user && isAuthRoute) {
  return NextResponse.redirect(new URL("/clientes", request.url));
}
```

Replace it with:

```typescript
if (user && isAuthRoute) {
  return NextResponse.redirect(new URL("/hoje", request.url));
}
```

Modify `app/(auth)/sign-in/actions.ts` — change the post-sign-in redirect from `/clientes` to `/hoje`. Locate the line:

```typescript
redirect("/clientes");
```

Replace it with:

```typescript
redirect("/hoje");
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add components/TopBar.tsx app/page.tsx lib/supabase/middleware.ts "app/(auth)/sign-in/actions.ts"
git commit -m "feat(app): nav links and redirect signed-in traffic to /hoje"
```

---

## Phase 6 — Charge detail page

### Task 13: `ChargeDetailForm` — editable amount + notes (pending only)

**Files:**

- Create: `components/ChargeDetailForm.tsx`

- [ ] **Step 1: Create the form component**

Create `components/ChargeDetailForm.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { brlToCents, formatBRL } from "@/lib/money";
import { updateChargeAction } from "@/features/charges/actions";

type Props = {
  chargeId: string;
  initialAmountCents: number;
  initialNotes: string | null;
};

export function ChargeDetailForm({ chargeId, initialAmountCents, initialNotes }: Props) {
  const [amountDisplay, setAmountDisplay] = useState(formatBRL(initialAmountCents));
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cents = brlToCents(amountDisplay);
    if (cents === null) {
      toast.error("Valor inválido.");
      return;
    }
    startTransition(async () => {
      const result = await updateChargeAction({
        charge_id: chargeId,
        amount_cents: cents,
        notes: notes === "" ? null : notes,
      });
      if (result?.error) toast.error(result.error);
      else toast.success("Cobrança atualizada.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Valor</Label>
        <Input
          id="amount"
          value={amountDisplay}
          onChange={(e) => setAmountDisplay(e.target.value)}
          placeholder="R$ 150,00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add components/ChargeDetailForm.tsx
git commit -m "feat(charges): detail edit form"
```

---

### Task 14: Charge detail page

**Files:**

- Create: `app/(app)/cobrancas/[id]/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/(app)/cobrancas/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChargeDetailForm } from "@/components/ChargeDetailForm";
import { MarkPaidDialog } from "@/components/MarkPaidDialog";
import { formatBRL } from "@/lib/money";
import { formatISODate, isoToBRDate } from "@/lib/date";
import { getChargeWithClient } from "@/features/charges/queries";
import { cancelChargeAction } from "@/features/charges/actions";

const statusLabel = {
  pending: "Pendente",
  paid: "Paga",
  canceled: "Cancelada",
} as const;

export default async function ChargeDetailPage({ params }: { params: { id: string } }) {
  const charge = await getChargeWithClient(params.id);
  if (!charge) notFound();

  const todayISO = formatISODate(new Date());
  const isOverdue = charge.status === "pending" && charge.due_date < todayISO;

  async function cancel() {
    "use server";
    await cancelChargeAction(params.id);
  }

  return (
    <section className="mx-auto max-w-lg space-y-4">
      <div className="space-y-1">
        <Link
          href={`/clientes/${charge.client.id}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          {charge.client.name}
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">Cobrança</h1>
          <Badge variant={charge.status === "paid" ? "default" : "secondary"}>
            {statusLabel[charge.status]}
          </Badge>
          {isOverdue && <Badge variant="destructive">Em atraso</Badge>}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-md border p-4 text-sm">
        <dt className="text-muted-foreground">Vencimento</dt>
        <dd>{isoToBRDate(charge.due_date)}</dd>
        {charge.status === "paid" && (
          <>
            <dt className="text-muted-foreground">Pago em</dt>
            <dd>{charge.paid_at ? isoToBRDate(charge.paid_at.slice(0, 10)) : "—"}</dd>
            <dt className="text-muted-foreground">Valor recebido</dt>
            <dd>{formatBRL(charge.paid_amount_cents ?? charge.amount_cents)}</dd>
            <dt className="text-muted-foreground">Forma</dt>
            <dd>{charge.payment_method ?? "—"}</dd>
          </>
        )}
      </dl>

      {charge.status === "pending" ? (
        <>
          <ChargeDetailForm
            chargeId={charge.id}
            initialAmountCents={charge.amount_cents}
            initialNotes={charge.notes}
          />

          <div className="grid grid-cols-2 gap-3 pt-2">
            <MarkPaidDialog
              chargeId={charge.id}
              defaultAmountCents={charge.amount_cents}
              trigger={<Button className="w-full">Marcar como pago</Button>}
            />
            <form action={cancel}>
              <Button type="submit" variant="destructive" className="w-full">
                Cancelar
              </Button>
            </form>
          </div>
        </>
      ) : (
        <div className="space-y-2 rounded-md border p-4 text-sm">
          <div className="text-muted-foreground">Valor cobrado</div>
          <div className="text-lg font-semibold">{formatBRL(charge.amount_cents)}</div>
          {charge.notes && (
            <>
              <div className="pt-2 text-muted-foreground">Observações</div>
              <p>{charge.notes}</p>
            </>
          )}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Typecheck and build**

```bash
pnpm typecheck
pnpm build
```

Expected: both exit code 0.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/cobrancas"
git commit -m "feat(charges): detail page with edit and cancel"
```

---

## Phase 7 — End-to-end verification

### Task 15: Playwright E2E — full Plan 2 golden path

**Files:**

- Create: `tests/e2e/charges.spec.ts`

- [ ] **Step 1: Write the test**

Create `tests/e2e/charges.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

test("charges rolling window and mark-paid golden path", async ({ page }) => {
  const email = `c${Date.now()}@example.test`;
  const password = "testpass1234";

  // Sign up
  await page.goto("/sign-up");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /Criar/ }).click();

  // Local Supabase auto-confirms; go sign in
  await page.goto("/sign-in");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await expect(page).toHaveURL(/\/hoje$/);

  // Empty Hoje state
  await expect(page.getByText("Nada para hoje")).toBeVisible();

  // Create a client whose first charge is due today
  const today = new Date().toISOString().slice(0, 10);
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome").fill("Maria Teste");
  await page.getByLabel("Telefone (WhatsApp)").fill("+5511999990000");
  await page.getByLabel("Valor padrão").fill("R$ 200,00");
  await page.getByLabel("Primeiro vencimento").fill(today);
  await page.getByRole("button", { name: "Criar" }).click();

  // Landed on client detail
  await expect(page.getByRole("heading", { name: "Maria Teste" })).toBeVisible();

  // Hoje now shows one charge due today
  await page.getByRole("link", { name: "Hoje" }).click();
  await expect(page).toHaveURL(/\/hoje$/);
  await expect(page.getByText("Maria Teste")).toBeVisible();
  await expect(page.getByText("R$ 200,00")).toBeVisible();

  // Mark the charge as paid
  await page.getByRole("button", { name: "Pago" }).first().click();
  await page.getByRole("button", { name: "Confirmar" }).click();

  // The row should disappear from Hoje
  await expect(page.getByText("Maria Teste")).toHaveCount(0);
  await expect(page.getByText("Nada para hoje")).toBeVisible();
});
```

- [ ] **Step 2: Ensure local Supabase is running**

If it's not already up:

```bash
pnpm exec supabase start
```

- [ ] **Step 3: Run the E2E**

```bash
pnpm test:e2e
```

Expected: both `smoke.spec.ts` (from Plan 1), `clients.spec.ts` (from Plan 1), and `charges.spec.ts` pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/charges.spec.ts
git commit -m "test(e2e): charges rolling window and mark-paid golden path"
```

---

### Task 16: Run the full check suite and push

**Files:** (no changes)

- [ ] **Step 1: Lint, typecheck, unit tests**

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Expected: all three exit code 0. Unit tests show cycle (17) + classify (4) + lib tests from Plan 1, all green.

- [ ] **Step 2: Format check**

```bash
pnpm format
```

If format made changes, commit them as a separate style commit:

```bash
git diff --quiet || { git add -u && git commit -m "style: prettier format plan 2"; }
```

- [ ] **Step 3: Push**

```bash
git push
```

Expected: GitHub Actions CI runs the lint + typecheck + vitest workflow from Plan 1 and all jobs pass.

---

## Closing checkpoint

At the end of Plan 2, the user should be able to:

- Sign up, sign in, and land on `/hoje`.
- Create a client and immediately see 3 pending charges rolling ahead of them in the database; the first one (or any that is due today or earlier) shows on `/hoje`.
- Open `/hoje` any day and see totals for today + overdue with a clear separation.
- Tap **Pago** on a charge row, pick a date/amount/method, confirm, and watch the row disappear while a new future charge is silently materialized.
- Open a charge detail page (`/cobrancas/[id]`), edit the amount or notes (pending only), mark paid, or cancel.
- See their paid history inline on the charge detail page for charges already paid.

### Spec coverage

- **§4 feature set:** charges CRUD (create via rolling window, update via detail form, mark paid via dialog, cancel via button), automatic rolling-window materialization (3 per client), partial-payment support (actual `paid_amount_cents` stored).
- **§6.2 charges table / §6.5 derived data:** pending-today-overdue splitting in the service layer (no `overdue` column); rolling window as a post-mutation hook.
- **§7.1 pages:** Hoje dashboard with banner and grouped lists.
- **§7.2 cobrança detail:** status pill, editable amount, notes, mark-paid, paid history.
- **§7.3 Marcar como pago:** date picker defaulting today, received amount defaulting to `amount_cents`, payment-method select; top-up fires on confirm.
- **§8.3 domain services:** `cycle.ts`, `classify.ts` are pure (no Supabase imports) and fully unit-tested.

### Next: Plan 3 — WhatsApp template + attachments + reports + settings

Plan 3 will add:

- `features/charges/services/template.ts` (fill `{nome}`, `{valor}`, `{vencimento}`) + the `Notificar pelo Whatsapp` row action (copy to clipboard + open `wa.me`).
- Attachment uploads (per charge) via Supabase Storage with signed URLs; `AttachmentGrid` component.
- Reports: current-month banner + historical-month list at `/relatorios` and `/relatorios/[yyyymm]` with per-client breakdown.
- Settings screen (`/ajustes`): editable message template, reminder email toggle + time (row persists but firing is wired in Plan 4), account row (sign out / erase my data).
- Mobile bottom-nav + desktop side-nav redesign now that the 4th tab exists.
- Nova cobrança avulsa on client detail.

Start Plan 3 only after Plan 2 is merged and the Playwright flow is green in CI.
