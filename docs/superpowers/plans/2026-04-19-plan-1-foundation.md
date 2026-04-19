# DojoPay Plan 1 — Foundation, Auth, and Clients CRUD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a deployable Next.js web app with Supabase auth and working Clientes (Clients) CRUD, so the user can sign up, sign in, and register/edit/archive clients. This is the first of four plans for DojoPay v1.

**Architecture:** Next.js 14 App Router on top of Supabase Postgres + Auth, with Row Level Security enforcing per-user data isolation. Pure-function domain services in `features/<domain>/services/` (TDD with Vitest); data mutations via server actions; reads via server components calling typed Supabase queries.

**Tech Stack:** Next.js 14 (App Router), TypeScript strict, pnpm, Tailwind CSS + shadcn/ui, Supabase (Postgres + Auth + Storage), `@supabase/ssr`, `react-hook-form` + `zod`, `date-fns`, `next-intl` (deferred wiring — Plan 4), Vitest, Playwright.

**Scope of Plan 1:**
- Project scaffolding, tooling, CI config
- `lib/` utilities with unit tests
- Supabase local dev + migrations + RLS + triggers
- Auth (email+password + Google OAuth) with protected routes
- Clients CRUD end-to-end (list, create, edit, archive, detail)
- One Playwright E2E test proving the golden path

**Not in Plan 1 (covered by later plans):**
- Charges, cycle engine, Hoje dashboard (Plan 2)
- WhatsApp template, attachments, reports, settings (Plan 3)
- Daily reminder email, PWA, i18n wiring, feature gate, Cloudflare Pages deployment, setup guide (Plan 4)

**Reference spec:** `docs/superpowers/specs/2026-04-19-dojopay-design.md`

**Conventions used throughout this plan:**
- Commit messages follow Conventional Commits (`feat:`, `test:`, `chore:`, `docs:`, `refactor:`).
- Every step lists exact commands and expected outputs. If a step says "Run … → expected: …" and you see a different output, stop and investigate before moving on.
- Every pure-function service is written TDD: failing test first, then implementation, then commit.

---

## Phase 0 — Repository and tooling

### Task 1: Initialize repository and Next.js project

**Files:**
- Create: `dojopay/package.json`, `dojopay/tsconfig.json`, `dojopay/next.config.mjs`, `dojopay/app/layout.tsx`, `dojopay/app/page.tsx`, `dojopay/.gitignore`, `dojopay/.nvmrc`

- [ ] **Step 1: Rename working directory if needed**

If the current working directory is `reminder_proj` (the pre-naming working folder) and not yet `dojopay`, rename it now:

```bash
cd /Users/klayver/Repositories
mv reminder_proj dojopay
cd dojopay
```

If the directory is already `dojopay`, skip this step.

- [ ] **Step 2: Scaffold the Next.js app in-place**

The directory already contains `docs/` and `.superpowers/`. `create-next-app` requires an empty destination, so move these aside temporarily:

```bash
mv docs /tmp/dojopay-docs
mv .superpowers /tmp/dojopay-superpowers 2>/dev/null || true
```

Scaffold Next.js into the current (now empty) directory:

```bash
pnpm dlx create-next-app@14 . \
  --typescript \
  --eslint \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --use-pnpm
```

Restore docs and any brainstorm artifacts:

```bash
mv /tmp/dojopay-docs docs
[ -d /tmp/dojopay-superpowers ] && mv /tmp/dojopay-superpowers .superpowers
```

Expected: `package.json`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`, `tailwind.config.ts` now exist alongside the preserved `docs/` and `.superpowers/` directories.

- [ ] **Step 3: Pin Node version**

Create `.nvmrc`:

```
20
```

- [ ] **Step 4: Initialize git and first commit**

```bash
git init
git branch -M main
git add .
git commit -m "chore: scaffold next.js app"
```

- [ ] **Step 5: Connect to the GitHub remote**

```bash
git remote add origin https://github.com/klayverpaz/dojopay.git
git push -u origin main
```

If the remote is empty, this succeeds. If the remote has commits, pull and rebase; there should be no conflicts because it's a new repo.

---

### Task 2: Enable strict TypeScript and extend tsconfig

**Files:**
- Modify: `tsconfig.json`

- [ ] **Step 1: Update tsconfig.json**

Replace the content of `tsconfig.json` with:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Verify typecheck still passes**

```bash
pnpm exec tsc --noEmit
```

Expected: exit code 0. If errors surface, they're almost always in `app/page.tsx`; fix by removing unused props.

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: enable strict typescript"
```

---

### Task 3: Install Vitest and set up unit-test infrastructure

**Files:**
- Create: `vitest.config.mts`, `tests/unit/.gitkeep`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install Vitest**

```bash
pnpm add -D vitest @vitest/ui @vitejs/plugin-react happy-dom
```

- [ ] **Step 2: Create vitest.config.mts**

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    include: ["tests/unit/**/*.test.{ts,tsx}", "lib/**/*.test.{ts,tsx}", "features/**/*.test.{ts,tsx}"],
    globals: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

- [ ] **Step 3: Add test script**

Modify `package.json` scripts section to include:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:ui": "vitest --ui"
}
```

- [ ] **Step 4: Create the test directory**

```bash
mkdir -p tests/unit tests/e2e
touch tests/unit/.gitkeep tests/e2e/.gitkeep
```

- [ ] **Step 5: Verify Vitest can run (with no tests yet)**

```bash
pnpm test
```

Expected: "No test files found" exit code 0. (If Vitest errors on "no tests," add `--passWithNoTests` to the `test` script.)

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: configure vitest"
```

---

### Task 4: Install shadcn/ui and configure Tailwind

**Files:**
- Create: `components.json`, `components/ui/` (various files generated by CLI)
- Modify: `tailwind.config.ts`, `app/globals.css`

- [ ] **Step 1: Initialize shadcn/ui**

```bash
pnpm dlx shadcn@latest init
```

Answers when prompted:
- Style: **Default**
- Base color: **Slate**
- CSS variables: **Yes**

The CLI will edit `tailwind.config.ts` and `app/globals.css`, and create `components.json` and `lib/utils.ts`.

- [ ] **Step 2: Add the components we know we'll use**

```bash
pnpm dlx shadcn@latest add button input label textarea dialog form select dropdown-menu toast separator card avatar badge sonner
```

Shadcn places components under `components/ui/`.

- [ ] **Step 3: Verify build still works**

```bash
pnpm build
```

Expected: exit code 0, output says "Compiled successfully".

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: add shadcn/ui components"
```

---

### Task 5: Install Playwright and write the placeholder E2E

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

- [ ] **Step 2: Create playwright.config.ts**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : { command: "pnpm dev", port: 3000, reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
```

- [ ] **Step 3: Add E2E scripts to package.json**

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 4: Write a smoke test**

Create `tests/e2e/smoke.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
```

- [ ] **Step 5: Run it**

```bash
pnpm test:e2e
```

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: configure playwright"
```

---

### Task 6: Configure Prettier

**Files:**
- Create: `.prettierrc.json`, `.prettierignore`

- [ ] **Step 1: Install Prettier and the Tailwind plugin**

```bash
pnpm add -D prettier prettier-plugin-tailwindcss
```

- [ ] **Step 2: Write .prettierrc.json**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

- [ ] **Step 3: Write .prettierignore**

```
.next
node_modules
pnpm-lock.yaml
.superpowers
supabase/.temp
```

- [ ] **Step 4: Add format scripts to package.json**

```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- [ ] **Step 5: Run formatter once**

```bash
pnpm format
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: configure prettier"
```

---

## Phase 1 — lib utilities (TDD)

### Task 7: `lib/money.ts` — cents↔BRL conversion

**Files:**
- Create: `lib/money.ts`, `tests/unit/lib/money.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/lib/money.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { centsToBRL, brlToCents, formatBRL } from "@/lib/money";

describe("centsToBRL", () => {
  it("converts integer cents to float reais", () => {
    expect(centsToBRL(12345)).toBe(123.45);
  });
  it("returns 0 for 0 cents", () => {
    expect(centsToBRL(0)).toBe(0);
  });
});

describe("brlToCents", () => {
  it("parses BRL decimal string to integer cents", () => {
    expect(brlToCents("123,45")).toBe(12345);
    expect(brlToCents("1.234,56")).toBe(123456);
    expect(brlToCents("R$ 99,90")).toBe(9990);
  });
  it("returns null for invalid input", () => {
    expect(brlToCents("abc")).toBeNull();
    expect(brlToCents("")).toBeNull();
  });
});

describe("formatBRL", () => {
  it("formats integer cents as BRL currency string", () => {
    expect(formatBRL(12345)).toBe("R$ 123,45");
    expect(formatBRL(0)).toBe("R$ 0,00");
    expect(formatBRL(99)).toBe("R$ 0,99");
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

```bash
pnpm test tests/unit/lib/money.test.ts
```

Expected: fails with "Cannot find module '@/lib/money'" or similar.

- [ ] **Step 3: Implement `lib/money.ts`**

```typescript
export function centsToBRL(cents: number): number {
  return cents / 100;
}

export function brlToCents(input: string): number | null {
  const cleaned = input.replace(/R\$\s*/g, "").replace(/\./g, "").replace(",", ".").trim();
  if (cleaned === "") return null;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
```

- [ ] **Step 4: Run the test, confirm it passes**

```bash
pnpm test tests/unit/lib/money.test.ts
```

Expected: 3 test suites, 7 tests passed.

- [ ] **Step 5: Commit**

```bash
git add lib/money.ts tests/unit/lib/money.test.ts
git commit -m "feat(lib): money conversion helpers"
```

---

### Task 8: `lib/date.ts` — date formatting + boundaries

**Files:**
- Create: `lib/date.ts`, `tests/unit/lib/date.test.ts`

- [ ] **Step 1: Install date-fns**

```bash
pnpm add date-fns date-fns-tz
```

- [ ] **Step 2: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { formatISODate, isoToBRDate, monthBoundsUTC } from "@/lib/date";

describe("formatISODate", () => {
  it("formats a Date to YYYY-MM-DD", () => {
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
```

- [ ] **Step 3: Confirm failure**

```bash
pnpm test tests/unit/lib/date.test.ts
```

Expected: fails with "Cannot find module".

- [ ] **Step 4: Implement lib/date.ts**

```typescript
import { format, parseISO } from "date-fns";

export function formatISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isoToBRDate(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy");
}

export function monthBoundsUTC(year: number, month: number): { start: string; endExclusive: string } {
  const start = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const endExclusive = `${nextYear.toString().padStart(4, "0")}-${nextMonth.toString().padStart(2, "0")}-01`;
  return { start, endExclusive };
}
```

- [ ] **Step 5: Confirm pass and commit**

```bash
pnpm test tests/unit/lib/date.test.ts
git add lib/date.ts tests/unit/lib/date.test.ts package.json pnpm-lock.yaml
git commit -m "feat(lib): date helpers"
```

---

### Task 9: `lib/uuid.ts` — client-side UUID v4

**Files:**
- Create: `lib/uuid.ts`, `tests/unit/lib/uuid.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { newId } from "@/lib/uuid";

describe("newId", () => {
  it("returns a UUID v4 string", () => {
    const id = newId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it("generates unique values", () => {
    const a = newId();
    const b = newId();
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Confirm failure**

```bash
pnpm test tests/unit/lib/uuid.test.ts
```

Expected: "Cannot find module '@/lib/uuid'".

- [ ] **Step 3: Implement**

```typescript
export function newId(): string {
  return globalThis.crypto.randomUUID();
}
```

- [ ] **Step 4: Confirm pass and commit**

```bash
pnpm test tests/unit/lib/uuid.test.ts
git add lib/uuid.ts tests/unit/lib/uuid.test.ts
git commit -m "feat(lib): uuid generator"
```

---

### Task 10: `lib/whatsapp.ts` — build wa.me URL

**Files:**
- Create: `lib/whatsapp.ts`, `tests/unit/lib/whatsapp.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl, normalizePhone } from "@/lib/whatsapp";

describe("normalizePhone", () => {
  it("strips +, spaces, hyphens, parentheses", () => {
    expect(normalizePhone("+55 (11) 98765-4321")).toBe("5511987654321");
  });
  it("returns null if no digits", () => {
    expect(normalizePhone("abc")).toBeNull();
  });
});

describe("buildWhatsAppUrl", () => {
  it("builds a wa.me link with URL-encoded message", () => {
    const url = buildWhatsAppUrl("+5511987654321", "Olá, tudo bem?");
    expect(url).toBe("https://wa.me/5511987654321?text=Ol%C3%A1%2C%20tudo%20bem%3F");
  });
  it("returns null when phone is invalid", () => {
    expect(buildWhatsAppUrl("not-a-phone", "hi")).toBeNull();
  });
});
```

- [ ] **Step 2: Confirm failure, then implement**

```typescript
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return digits.length === 0 ? null : digits;
}

export function buildWhatsAppUrl(phone: string, text: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${normalized}?text=${encoded}`;
}
```

- [ ] **Step 3: Confirm pass and commit**

```bash
pnpm test tests/unit/lib/whatsapp.test.ts
git add lib/whatsapp.ts tests/unit/lib/whatsapp.test.ts
git commit -m "feat(lib): whatsapp url builder"
```

---

## Phase 2 — Supabase schema and migrations

### Task 11: Install Supabase CLI and start local stack

**Files:**
- Create: `supabase/config.toml` (auto-generated)

- [ ] **Step 1: Install the Supabase CLI via pnpm**

```bash
pnpm add -D supabase
```

This adds the CLI as a dev dependency; invoke with `pnpm exec supabase`.

- [ ] **Step 2: Initialize the supabase folder**

```bash
pnpm exec supabase init
```

Accept defaults. This creates `supabase/config.toml` and `supabase/seed.sql`.

- [ ] **Step 3: Start the local Supabase stack**

```bash
pnpm exec supabase start
```

Expected: starts Docker containers for Postgres, GoTrue, Storage, Studio. Prints connection details; copy the API URL, anon key, and service role key.

If Docker is not running, start Docker Desktop and retry.

- [ ] **Step 4: Create .env.local with the local credentials**

Create `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key printed by supabase start>
SUPABASE_SERVICE_ROLE_KEY=<service role key printed by supabase start>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add `.env.local` to `.gitignore` if not already there:

```bash
grep -q "^\.env\.local$" .gitignore || echo ".env.local" >> .gitignore
```

- [ ] **Step 5: Commit the supabase scaffolding**

```bash
git add supabase .gitignore
git commit -m "chore: initialize supabase local stack"
```

---

### Task 12: Initial migration — tables and enums

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Create the migration file**

```bash
pnpm exec supabase migration new init
```

This creates an empty file `supabase/migrations/<timestamp>_init.sql`. Rename it to `0001_init.sql` (keeping a predictable number):

```bash
mv supabase/migrations/*_init.sql supabase/migrations/0001_init.sql
```

- [ ] **Step 2: Write the schema**

Fill `supabase/migrations/0001_init.sql`:

```sql
-- Enums
create type cycle_kind as enum ('days', 'weeks', 'months');
create type charge_status as enum ('pending', 'paid', 'canceled');
create type payment_method as enum ('pix', 'cash', 'transfer', 'other');

-- Clients
create table public.clients (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone_e164 text,
  default_amount_cents bigint not null check (default_amount_cents >= 0),
  cycle_kind cycle_kind not null,
  cycle_every integer not null check (cycle_every >= 1),
  cycle_anchor_date date not null,
  cycle_end_date date,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index clients_owner_id_idx on public.clients(owner_id);

-- Charges
create table public.charges (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  due_date date not null,
  amount_cents bigint not null check (amount_cents >= 0),
  status charge_status not null default 'pending',
  paid_at timestamptz,
  paid_amount_cents bigint check (paid_amount_cents is null or paid_amount_cents >= 0),
  payment_method payment_method,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index charges_owner_due_idx on public.charges(owner_id, due_date);
create index charges_owner_client_idx on public.charges(owner_id, client_id);
create index charges_owner_status_due_idx on public.charges(owner_id, status, due_date);

-- Attachments
create table public.attachments (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  charge_id uuid not null references public.charges(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint,
  original_name text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index attachments_charge_idx on public.attachments(charge_id);

-- Settings (one row per user)
create table public.settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  message_template text not null,
  default_cycle_kind cycle_kind not null default 'months',
  default_cycle_every integer not null default 1,
  currency text not null default 'BRL',
  locale text not null default 'pt-BR',
  email_reminders_enabled boolean not null default true,
  daily_reminder_time time not null default '09:00',
  daily_reminder_timezone text not null default 'America/Sao_Paulo',
  notify_only_if_any boolean not null default true,
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 3: Apply the migration locally**

```bash
pnpm exec supabase db reset
```

Expected: rebuilds the local DB, runs `0001_init.sql`, prints "Finished migrations". No errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat(db): initial schema"
```

---

### Task 13: RLS policies migration

**Files:**
- Create: `supabase/migrations/0002_rls.sql`

- [ ] **Step 1: Create the migration**

```bash
pnpm exec supabase migration new rls
mv supabase/migrations/*_rls.sql supabase/migrations/0002_rls.sql
```

- [ ] **Step 2: Write RLS policies**

Fill `supabase/migrations/0002_rls.sql`:

```sql
alter table public.clients enable row level security;
alter table public.charges enable row level security;
alter table public.attachments enable row level security;
alter table public.settings enable row level security;

create policy clients_owner_rw on public.clients
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy charges_owner_rw on public.charges
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy attachments_owner_rw on public.attachments
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy settings_owner_rw on public.settings
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
```

- [ ] **Step 3: Apply locally and commit**

```bash
pnpm exec supabase db reset
git add supabase/migrations/0002_rls.sql
git commit -m "feat(db): rls policies"
```

---

### Task 14: Triggers and handle_new_user migration

**Files:**
- Create: `supabase/migrations/0003_triggers.sql`

- [ ] **Step 1: Create the migration**

```bash
pnpm exec supabase migration new triggers
mv supabase/migrations/*_triggers.sql supabase/migrations/0003_triggers.sql
```

- [ ] **Step 2: Write triggers**

```sql
-- Generic updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger charges_set_updated_at
  before update on public.charges
  for each row execute function public.set_updated_at();

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- Seed settings for each new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.settings (owner_id, message_template)
  values (new.id,
          'Olá {nome}, tudo bem? Passando para lembrar da mensalidade de {valor} com vencimento em {vencimento}. Qualquer dúvida me avise. Obrigado!');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 3: Apply and commit**

```bash
pnpm exec supabase db reset
git add supabase/migrations/0003_triggers.sql
git commit -m "feat(db): triggers and handle_new_user"
```

---

### Task 15: Create Storage bucket for attachments

**Files:**
- Create: `supabase/migrations/0004_storage.sql`

- [ ] **Step 1: Create the migration**

```bash
pnpm exec supabase migration new storage
mv supabase/migrations/*_storage.sql supabase/migrations/0004_storage.sql
```

- [ ] **Step 2: Write the bucket + policy**

```sql
insert into storage.buckets (id, name, public) values ('attachments', 'attachments', false);

create policy "attachments_owner_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and owner = auth.uid());

create policy "attachments_owner_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and owner = auth.uid());

create policy "attachments_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'attachments' and owner = auth.uid());
```

- [ ] **Step 3: Apply and commit**

```bash
pnpm exec supabase db reset
git add supabase/migrations/0004_storage.sql
git commit -m "feat(db): storage bucket and policies"
```

---

### Task 16: Generate TypeScript types from schema

**Files:**
- Create: `lib/supabase/types.ts`
- Modify: `package.json`

- [ ] **Step 1: Add a typegen script to package.json**

Add to scripts:

```json
"db:types": "supabase gen types typescript --local > lib/supabase/types.ts"
```

- [ ] **Step 2: Generate types**

```bash
mkdir -p lib/supabase
pnpm exec supabase gen types typescript --local > lib/supabase/types.ts
```

Expected: a `Database` type is emitted to `lib/supabase/types.ts` with our table definitions.

- [ ] **Step 3: Confirm typecheck passes**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/types.ts package.json
git commit -m "chore(db): generate typescript types"
```

---

## Phase 3 — Auth

### Task 17: Supabase client factories

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/browser.ts`

- [ ] **Step 1: Install auth helper**

```bash
pnpm add @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 2: Server client factory**

Create `lib/supabase/server.ts`:

```typescript
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — no-op, middleware will refresh
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Same reason
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Browser client factory**

Create `lib/supabase/browser.ts`:

```typescript
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 4: Typecheck and commit**

```bash
pnpm typecheck
git add lib/supabase/server.ts lib/supabase/browser.ts package.json pnpm-lock.yaml
git commit -m "feat(supabase): client factories"
```

---

### Task 18: Middleware for session refresh and route protection

**Files:**
- Create: `middleware.ts`, `lib/supabase/middleware.ts`

- [ ] **Step 1: Create lib/supabase/middleware.ts**

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAuthRoute =
    request.nextUrl.pathname.startsWith("/sign-in") ||
    request.nextUrl.pathname.startsWith("/sign-up");

  if (!user && !isAuthRoute && request.nextUrl.pathname !== "/") {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/clientes", request.url));
  }

  return response;
}
```

- [ ] **Step 2: Create the top-level middleware.ts**

```typescript
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/).*)"],
};
```

- [ ] **Step 3: Commit**

```bash
git add middleware.ts lib/supabase/middleware.ts
git commit -m "feat(auth): middleware for session refresh and route guards"
```

---

### Task 19: Root layout and landing page

**Files:**
- Modify: `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Root layout**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "DojoPay",
  description: "Gerencie cobranças recorrentes de forma simples.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Landing page redirects**

Replace `app/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? "/clientes" : "/sign-in");
}
```

- [ ] **Step 3: Typecheck, then commit**

```bash
pnpm typecheck
git add app/layout.tsx app/page.tsx
git commit -m "feat(app): root layout and landing redirect"
```

---

### Task 20: Sign-in page (email/password)

**Files:**
- Create: `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-in/actions.ts`, `app/(auth)/layout.tsx`

- [ ] **Step 1: Auth group layout (shared wrapper)**

Create `app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
```

- [ ] **Step 2: Server action for sign-in**

Create `app/(auth)/sign-in/actions.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }
  redirect("/clientes");
}
```

- [ ] **Step 3: Sign-in page component**

Create `app/(auth)/sign-in/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { signInWithPassword } from "./actions";

export default function SignInPage() {
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await signInWithPassword(formData);
    setPending(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/sign-up" className="underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 4: Typecheck and commit**

```bash
pnpm typecheck
git add "app/(auth)"
git commit -m "feat(auth): sign-in page"
```

---

### Task 21: Sign-up page (email/password)

**Files:**
- Create: `app/(auth)/sign-up/page.tsx`, `app/(auth)/sign-up/actions.ts`

- [ ] **Step 1: Server action**

Create `app/(auth)/sign-up/actions.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }
  redirect("/sign-up/check-email");
}
```

- [ ] **Step 2: Sign-up page**

Create `app/(auth)/sign-up/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { signUp } from "./actions";

export default function SignUpPage() {
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    const result = await signUp(formData);
    setPending(false);
    if (result?.error) toast.error(result.error);
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <h1 className="text-2xl font-semibold">Criar conta</h1>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Criando..." : "Criar conta"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/sign-in" className="underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Step 3: Check-email stub**

Create `app/(auth)/sign-up/check-email/page.tsx`:

```tsx
export default function CheckEmailPage() {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-2xl font-semibold">Verifique seu e-mail</h1>
      <p className="text-sm text-muted-foreground">
        Enviamos um link de confirmação. Abra-o para continuar.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck and commit**

```bash
pnpm typecheck
git add "app/(auth)/sign-up"
git commit -m "feat(auth): sign-up page"
```

---

### Task 22: Sign-out action

**Files:**
- Create: `app/(app)/actions/sign-out.ts`

- [ ] **Step 1: Create the action**

Create `app/(app)/actions/sign-out.ts`:

```typescript
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(app)/actions/sign-out.ts"
git commit -m "feat(auth): sign-out action"
```

---

### Task 23: Authenticated app layout with top bar

**Files:**
- Create: `app/(app)/layout.tsx`, `components/TopBar.tsx`

- [ ] **Step 1: TopBar component**

Create `components/TopBar.tsx`:

```tsx
import { signOut } from "@/app/(app)/actions/sign-out";
import { Button } from "@/components/ui/button";

export function TopBar({ email }: { email: string }) {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <span className="font-semibold">DojoPay</span>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{email}</span>
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

- [ ] **Step 2: (app) layout**

Create `app/(app)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar email={user.email ?? ""} />
      <main className="flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
pnpm typecheck
git add "app/(app)/layout.tsx" components/TopBar.tsx
git commit -m "feat(app): authed layout with top bar"
```

---

## Phase 4 — Clients feature

### Task 24: Clients domain types and queries

**Files:**
- Create: `features/clients/types.ts`, `features/clients/queries.ts`

- [ ] **Step 1: Types**

Create `features/clients/types.ts`:

```typescript
export type CycleKind = "days" | "weeks" | "months";

export interface Client {
  id: string;
  owner_id: string;
  name: string;
  phone_e164: string | null;
  default_amount_cents: number;
  cycle_kind: CycleKind;
  cycle_every: number;
  cycle_anchor_date: string; // ISO date
  cycle_end_date: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NewClientInput {
  name: string;
  phone_e164: string | null;
  default_amount_cents: number;
  cycle_kind: CycleKind;
  cycle_every: number;
  cycle_anchor_date: string;
  cycle_end_date: string | null;
  notes: string | null;
}
```

- [ ] **Step 2: Queries**

Create `features/clients/queries.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import type { Client } from "./types";

export async function listClients(): Promise<Client[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Client[];
}

export async function getClient(id: string): Promise<Client | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Client | null) ?? null;
}
```

- [ ] **Step 3: Commit**

```bash
pnpm typecheck
git add features/clients
git commit -m "feat(clients): types and queries"
```

---

### Task 25: Create-client server action with zod validation

**Files:**
- Create: `features/clients/schema.ts`, `features/clients/actions.ts`

- [ ] **Step 1: Install zod**

```bash
pnpm add zod
```

- [ ] **Step 2: Schema**

Create `features/clients/schema.ts`:

```typescript
import { z } from "zod";

export const cycleKind = z.enum(["days", "weeks", "months"]);

export const clientInputSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  phone_e164: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, "Telefone inválido")
    .nullable()
    .or(z.literal("").transform(() => null)),
  default_amount_cents: z.number().int().nonnegative(),
  cycle_kind: cycleKind,
  cycle_every: z.number().int().min(1).max(366),
  cycle_anchor_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cycle_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  notes: z.string().max(2000).nullable(),
});

export type ClientInput = z.infer<typeof clientInputSchema>;
```

- [ ] **Step 3: Create action**

Create `features/clients/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabase } from "@/lib/supabase/server";
import { newId } from "@/lib/uuid";
import { clientInputSchema, type ClientInput } from "./schema";

export async function createClientAction(input: ClientInput) {
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = createSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const id = newId();
  const { error } = await supabase.from("clients").insert({
    id,
    owner_id: user.id,
    ...parsed.data,
  });
  if (error) return { error: error.message };

  revalidatePath("/clientes");
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

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
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
  redirect("/clientes");
}
```

- [ ] **Step 4: Typecheck and commit**

```bash
pnpm typecheck
git add features/clients package.json pnpm-lock.yaml
git commit -m "feat(clients): schema and CRUD actions"
```

---

### Task 26: Clients list page

**Files:**
- Create: `app/(app)/clientes/page.tsx`, `components/ClientRow.tsx`, `components/EmptyState.tsx`

- [ ] **Step 1: EmptyState component**

Create `components/EmptyState.tsx`:

```tsx
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
```

- [ ] **Step 2: ClientRow component**

Create `components/ClientRow.tsx`:

```tsx
import Link from "next/link";
import { formatBRL } from "@/lib/money";
import type { Client } from "@/features/clients/types";

const cycleLabel: Record<Client["cycle_kind"], string> = {
  days: "dias",
  weeks: "semanas",
  months: "meses",
};

export function ClientRow({ client }: { client: Client }) {
  return (
    <Link
      href={`/clientes/${client.id}`}
      className="flex items-center justify-between rounded-md border p-3 hover:bg-muted"
    >
      <div>
        <div className="font-medium">{client.name}</div>
        <div className="text-xs text-muted-foreground">
          A cada {client.cycle_every} {cycleLabel[client.cycle_kind]}
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold">{formatBRL(client.default_amount_cents)}</div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Clients list page**

Create `app/(app)/clientes/page.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientRow } from "@/components/ClientRow";
import { EmptyState } from "@/components/EmptyState";
import { listClients } from "@/features/clients/queries";

export default async function ClientesPage() {
  const clients = await listClients();

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Button asChild>
          <Link href="/clientes/novo">Adicionar</Link>
        </Button>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente ainda"
          description="Adicione seu primeiro cliente para começar."
          action={
            <Button asChild>
              <Link href="/clientes/novo">Adicionar cliente</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <ClientRow key={c.id} client={c} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Typecheck and commit**

```bash
pnpm typecheck
git add "app/(app)/clientes" components/ClientRow.tsx components/EmptyState.tsx
git commit -m "feat(clients): list page"
```

---

### Task 27: New-client form page

**Files:**
- Create: `app/(app)/clientes/novo/page.tsx`, `components/ClientForm.tsx`

- [ ] **Step 1: Install react-hook-form**

```bash
pnpm add react-hook-form @hookform/resolvers
```

- [ ] **Step 2: ClientForm component**

Create `components/ClientForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { brlToCents, formatBRL } from "@/lib/money";
import { clientInputSchema, type ClientInput } from "@/features/clients/schema";

type Props = {
  defaultValues?: Partial<ClientInput>;
  onSubmit: (values: ClientInput) => Promise<{ error?: string; success?: boolean } | void>;
  submitLabel: string;
};

export function ClientForm({ defaultValues, onSubmit, submitLabel }: Props) {
  const [amountDisplay, setAmountDisplay] = useState(
    defaultValues?.default_amount_cents != null ? formatBRL(defaultValues.default_amount_cents) : "",
  );

  const form = useForm<ClientInput>({
    resolver: zodResolver(clientInputSchema),
    defaultValues: {
      name: "",
      phone_e164: null,
      default_amount_cents: 0,
      cycle_kind: "months",
      cycle_every: 1,
      cycle_anchor_date: new Date().toISOString().slice(0, 10),
      cycle_end_date: null,
      notes: null,
      ...defaultValues,
    },
  });

  async function handleSubmit(values: ClientInput) {
    const result = await onSubmit(values);
    if (result && "error" in result && result.error) toast.error(result.error);
    else toast.success("Salvo.");
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" {...form.register("name")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone (WhatsApp)</Label>
        <Input
          id="phone"
          placeholder="+5511987654321"
          {...form.register("phone_e164", { setValueAs: (v) => (v === "" ? null : v) })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Valor padrão</Label>
        <Input
          id="amount"
          value={amountDisplay}
          onChange={(e) => {
            setAmountDisplay(e.target.value);
            const cents = brlToCents(e.target.value);
            form.setValue("default_amount_cents", cents ?? 0, { shouldValidate: true });
          }}
          placeholder="R$ 150,00"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>A cada</Label>
          <Input type="number" min={1} {...form.register("cycle_every", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>Período</Label>
          <Select
            defaultValue={form.getValues("cycle_kind")}
            onValueChange={(v) => form.setValue("cycle_kind", v as ClientInput["cycle_kind"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days">dias</SelectItem>
              <SelectItem value="weeks">semanas</SelectItem>
              <SelectItem value="months">meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="anchor">Primeiro vencimento</Label>
          <Input id="anchor" type="date" {...form.register("cycle_anchor_date")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end">Final (opcional)</Label>
          <Input
            id="end"
            type="date"
            {...form.register("cycle_end_date", { setValueAs: (v) => (v === "" ? null : v) })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          rows={3}
          {...form.register("notes", { setValueAs: (v) => (v === "" ? null : v) })}
        />
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: New-client page**

Create `app/(app)/clientes/novo/page.tsx`:

```tsx
import { ClientForm } from "@/components/ClientForm";
import { createClientAction } from "@/features/clients/actions";

export default function NovoClientePage() {
  return (
    <section className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Novo cliente</h1>
      <ClientForm onSubmit={createClientAction} submitLabel="Criar" />
    </section>
  );
}
```

- [ ] **Step 4: Typecheck and commit**

```bash
pnpm typecheck
git add components/ClientForm.tsx "app/(app)/clientes/novo" package.json pnpm-lock.yaml
git commit -m "feat(clients): new-client page"
```

---

### Task 28: Client detail page

**Files:**
- Create: `app/(app)/clientes/[id]/page.tsx`

- [ ] **Step 1: Detail page**

Create `app/(app)/clientes/[id]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getClient } from "@/features/clients/queries";
import { formatBRL } from "@/lib/money";
import { isoToBRDate } from "@/lib/date";
import { archiveClientAction } from "@/features/clients/actions";

const cycleLabel = { days: "dias", weeks: "semanas", months: "meses" } as const;

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) notFound();

  async function archive() {
    "use server";
    await archiveClientAction(params.id);
  }

  return (
    <section className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{client.name}</h1>
        <Button asChild variant="outline">
          <Link href={`/clientes/${client.id}/editar`}>Editar</Link>
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-md border p-4 text-sm">
        <dt className="text-muted-foreground">Telefone</dt>
        <dd>{client.phone_e164 ?? "—"}</dd>
        <dt className="text-muted-foreground">Valor padrão</dt>
        <dd>{formatBRL(client.default_amount_cents)}</dd>
        <dt className="text-muted-foreground">Ciclo</dt>
        <dd>
          A cada {client.cycle_every} {cycleLabel[client.cycle_kind]}
        </dd>
        <dt className="text-muted-foreground">Primeiro vencimento</dt>
        <dd>{isoToBRDate(client.cycle_anchor_date)}</dd>
        <dt className="text-muted-foreground">Final</dt>
        <dd>{client.cycle_end_date ? isoToBRDate(client.cycle_end_date) : "—"}</dd>
      </dl>

      {client.notes && (
        <div className="rounded-md border p-4 text-sm">
          <div className="mb-1 text-muted-foreground">Observações</div>
          <p>{client.notes}</p>
        </div>
      )}

      <form action={archive}>
        <Button type="submit" variant="destructive" className="w-full">
          Arquivar cliente
        </Button>
      </form>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add "app/(app)/clientes/[id]/page.tsx"
git commit -m "feat(clients): detail page"
```

---

### Task 29: Edit-client page

**Files:**
- Create: `app/(app)/clientes/[id]/editar/page.tsx`

- [ ] **Step 1: Editar page**

Create `app/(app)/clientes/[id]/editar/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { ClientForm } from "@/components/ClientForm";
import { getClient } from "@/features/clients/queries";
import { updateClientAction } from "@/features/clients/actions";
import type { ClientInput } from "@/features/clients/schema";

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) notFound();

  const defaults: Partial<ClientInput> = {
    name: client.name,
    phone_e164: client.phone_e164,
    default_amount_cents: client.default_amount_cents,
    cycle_kind: client.cycle_kind,
    cycle_every: client.cycle_every,
    cycle_anchor_date: client.cycle_anchor_date,
    cycle_end_date: client.cycle_end_date,
    notes: client.notes,
  };

  async function submit(values: ClientInput) {
    "use server";
    return updateClientAction(params.id, values);
  }

  return (
    <section className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Editar cliente</h1>
      <ClientForm defaultValues={defaults} onSubmit={submit} submitLabel="Salvar" />
    </section>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add "app/(app)/clientes/[id]/editar"
git commit -m "feat(clients): edit page"
```

---

## Phase 5 — End-to-end verification

### Task 30: Playwright E2E — sign up, create client, see it

**Files:**
- Modify: `tests/e2e/smoke.spec.ts` → replace with real flow
- Create: `tests/e2e/clients.spec.ts`

- [ ] **Step 1: Make the smoke redirect-aware**

Replace `tests/e2e/smoke.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

test("unauthenticated root redirects to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});
```

- [ ] **Step 2: Write the clients E2E**

Create `tests/e2e/clients.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

test("sign-up then create client golden path", async ({ page }) => {
  const email = `u${Date.now()}@example.test`;
  const password = "testpass1234";

  // Sign up
  await page.goto("/sign-up");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /Criar/ }).click();

  // Local Supabase auto-confirms; navigate to sign-in to complete auth
  await page.goto("/sign-in");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await expect(page).toHaveURL(/\/clientes$/);

  // Empty state visible
  await expect(page.getByText("Nenhum cliente ainda")).toBeVisible();

  // Create a client
  await page.getByRole("link", { name: /Adicionar/ }).first().click();
  await page.getByLabel("Nome").fill("João da Silva");
  await page.getByLabel("Telefone (WhatsApp)").fill("+5511987654321");
  await page.getByLabel("Valor padrão").fill("R$ 150,00");
  await page.getByRole("button", { name: "Criar" }).click();

  // We land on the detail page
  await expect(page.getByRole("heading", { name: "João da Silva" })).toBeVisible();
});
```

- [ ] **Step 3: Confirm local supabase auto-confirms signups**

Open `supabase/config.toml` and ensure the `[auth]` section has `enable_signup = true` and `enable_confirmations = false` for local dev. If confirmations are on, signed-up users can't log in without clicking an email link. The default for `supabase init` is confirmations off; confirm. If not, set it to `false`.

- [ ] **Step 4: Run the E2E**

Supabase needs to be running locally: `pnpm exec supabase start` (if not already).

```bash
pnpm test:e2e
```

Expected: both specs pass.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e supabase/config.toml
git commit -m "test(e2e): sign-up and create-client golden path"
```

---

## Phase 6 — CI

### Task 31: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

- [ ] **Step 2: Commit and push**

```bash
git add .github/workflows/ci.yml
git commit -m "chore(ci): github actions for lint, typecheck, tests"
git push
```

Expected: GitHub Actions runs on the push and succeeds.

---

## Closing checkpoint

At the end of Plan 1, you should have:

- A Next.js app at `http://localhost:3000` that redirects unauthenticated visitors to `/sign-in`.
- Working sign-up and sign-in forms (email/password against local Supabase).
- An authenticated shell at `/clientes` with top-bar sign-out.
- Create / list / view / edit / archive for clients with RLS isolating users.
- `lib/` utilities covered by unit tests.
- One Playwright E2E proving the golden path.
- GitHub Actions CI running lint, typecheck, and Vitest on every PR.

### Next: Plan 2 — Charges and the Hoje dashboard

Plan 2 will implement:

- `features/charges/services/cycle.ts` — next-N-due-dates function (TDD, full edge-case coverage: day 31 month-ends, year boundaries, `cycle_end_date`).
- `features/charges/services/classify.ts` — today vs. overdue classifier (TDD).
- Rolling-window service: materialize 3 upcoming charges per client on sign-in and after mutations.
- Charges CRUD + mark-paid action + modal.
- Hoje dashboard page with the today/overdue banner.
- Charge detail page with inline-editable amount and notes.

Plan 1 will be the foundation Plan 2 builds on. Only start Plan 2 after Plan 1 is shipped and verified end-to-end.
