# DojoPay — Design Specification (v1)

| | |
|---|---|
| **App name** | DojoPay |
| **Repository** | https://github.com/klayverpaz/dojopay.git |
| **Spec date** | 2026-04-19 |
| **Status** | Design approved — ready for implementation plan |
| **Target locale (v1)** | `pt-BR` only (i18n scaffolding in place for later languages) |
| **Delivery form (v1)** | **Responsive web app (PWA), deployed on Cloudflare Pages.** Accessed via URL in any modern browser — mobile or desktop. Users can add the app to their home screen for an app-like launcher experience. |
| **Hosting posture** | All v1 infrastructure runs on free tiers with explicit commercial-use allowance (Cloudflare Pages, Supabase, Resend, GitHub Actions). No paid service required for v1, including when a paid subscription tier is later activated. |

This document is the source of truth for DojoPay v1. Implementation plans and code reference this file. When a decision changes, update this spec first.

---

## 1. Context and problem

The idea originated from a Brazilian jiu-jitsu trainer who manages his students' monthly payments in a spreadsheet. He is not technically sophisticated, and the spreadsheet workflow costs him time every month (checking who owes, drafting each WhatsApp message by hand, tracking who has paid, remembering dates).

DojoPay replaces that workflow with a small web app that:

- Registers each client (a student, tenant, or any recipient of recurring charges) with a default amount, phone number, and billing cycle rule.
- Automatically materializes upcoming charges on a rolling window per client.
- Shows what is due *today* and what is *overdue* at a glance when the app opens.
- Generates a PT-BR WhatsApp message from a user-editable template and copies it / opens WhatsApp at the client's chat via `https://wa.me/...`.
- Lets the user mark a charge as paid, attach receipt images, and record the actual amount received (which may differ from the charge amount).
- Reports monthly totals so the user can see income at a glance.
- Sends a daily summary email ("Você tem 2 cobranças hoje e 3 em atraso") at a user-configured time.

Although the initial user is a BJJ trainer, the data model and UI are **generic** — the entity is "cliente," not "student." Any recurring-billing use case (language tutors, cleaners, rent, subscriptions the user collects) fits.

**Design principles:**

1. **Cloud-first.** Data lives in Supabase Postgres from day 1. The browser talks to Supabase through server actions running on Cloudflare Pages. Multi-device access is inherent.
2. **Progressive enhancement, not installation.** The app works as a normal website. Users who want an app-like experience add it to their home screen (PWA). We never block behind an "install" step.
3. **Free-tier infrastructure, commercially permitted.** Every hosted service chosen (Cloudflare Pages, Supabase, Resend) explicitly allows commercial use on its free tier, so the v1 cost structure survives the day we activate a paid subscription feature in v2.
4. **Tiny UI surface, large defaults.** One-tap common actions (mark paid, notify via WhatsApp). Smart pre-filling of amounts and dates.
5. **Generic domain terms in code.** `clients`, not `students`. Makes future pivots and re-positioning cheap.

## 2. Goals and non-goals

### Goals (v1)

- Ship a responsive web app at a public URL (Cloudflare Pages subdomain initially; custom domain when desired).
- Full CRUD on clients, charges, attachments; today/overdue dashboard; monthly reports; editable WhatsApp template.
- Supabase Auth with email+password and Google sign-in; Postgres with Row Level Security so each user sees only their own data.
- Daily reminder email per user at their configured time, containing today + overdue counts.
- PWA manifest and service worker so users can "add to home screen" and get an app-like icon/launcher experience.
- Developer-setup guide (`docs/setup-guide.md`) in PT-BR for the user, who has no prior experience with Next.js / Supabase / Cloudflare.

### Non-goals (v1)

- Offline writes. The service worker caches static assets for faster load and resilient offline shell, but mutations require a connection.
- Web Push notifications. Replaced in v1 by daily email; Web Push is deferred; see §14.
- Active subscription enforcement. Feature-gate hooks exist but return `true` by default.
- Multiple message templates (single editable template).
- Per-client documents (only per-charge attachments).
- Date-range filters or CSV export in reports.
- Multi-language UI (i18n scaffolding is in place but only `pt-BR` is shipped).

## 3. Users and flows

**Primary persona — "the operator":** a small-business operator tracking recurring charges from 5–50 people. Uses WhatsApp daily. Low patience for complex UI. Opens the app once a day or less.

**Golden-path flow (daily use):**

1. Receives the daily summary email at 09:00: "Você tem 2 cobranças hoje e 3 em atraso. Abrir DojoPay →".
2. Clicks the link; app opens in browser, signed in if the session is still valid.
3. **Hoje** page shows today's and overdue charges with totals.
4. Taps a charge → reviews amount, taps **Notificar pelo Whatsapp** → message is copied to clipboard and WhatsApp opens to the client's chat via `https://wa.me/`.
5. Later, client pays. Operator taps **Marcar como pago**, optionally attaches receipt image, confirms amount received, and the next charge in the client's cycle is materialized.
6. End-of-month, operator opens **Relatórios** to see how much was received.

**First-run flow:**

1. Operator opens the URL for the first time.
2. Landing → sign-up via Supabase (email+password or Google).
3. PWA install hint after first successful load ("Para acessar mais rápido, toque em '…' → 'Adicionar à Tela de Início'").
4. Empty Hoje state → "Adicionar primeiro cliente" button.
5. Client form → save → rolling window of upcoming charges generated → return to Hoje with data.

## 4. Feature set (v1)

- Authentication (Supabase Auth: email+password, Google OAuth).
- Clients: CRUD + soft delete + archive.
- Charges: automatic materialization via rolling window (3 upcoming per client), editable amount per charge, mark paid / canceled, partial-payment support (actual received amount stored).
- Attachments (per charge): images via `<input type="file" accept="image/*" capture="environment">` (browser opens camera or gallery); PDFs accepted via the same picker. Uploaded to Supabase Storage under an auth-scoped path.
- WhatsApp template: single editable PT-BR template with `{nome}`, `{valor}`, `{vencimento}` placeholders. Copy-to-clipboard + open `https://wa.me/<phone_no_plus>?text=<urlencoded>`.
- Reports: current-month banner + historical month list; tap a month → per-client breakdown.
- Daily reminder email: at the user's `daily_reminder_time` (default 09:00 BRT), sent via a Supabase Edge Function cron job + Resend (or similar transactional email provider). Subject and body include today + overdue counts, plus a deep link.
- Settings: message template editor, reminder email time + on/off, account (sign out / erase all my data).
- i18n scaffolding (all strings via `next-intl` keys; `pt-BR` only in v1).
- Feature-gate scaffolding (`useIsPro` / `useCanAddClient` in place; always return `true` in v1).
- PWA: manifest + service worker for install-to-home-screen and offline-assets caching.
- Responsive layout: mobile-first, with bottom navigation on small screens and a side navigation on `lg:` (desktop).

## 5. Architecture

Next.js 14 App Router. Server components for data fetching, client components for interactivity. Supabase is the single data source.

Layers (top to bottom):

| Layer | Location | Responsibility |
|---|---|---|
| UI | `app/` (pages/layouts), `components/` | Pages, layouts, UI primitives. Server components fetch; client components interact. |
| Features | `features/<domain>/` | Domain logic and server actions that UI calls. Groups: `clients`, `charges`, `reports`, `notifications`, `billing`, `auth`. |
| Data access | `lib/supabase/` | Server + browser Supabase client factories; typed query helpers. |
| Domain services | `features/<domain>/services/` | Pure functions (cycle generation, template filling, monthly aggregation). No Supabase. |
| Database | Supabase Postgres | Tables + RLS + scheduled jobs (pg_cron) + Edge Functions. |
| Storage | Supabase Storage | Per-user bucket for attachment files. |
| Email | Supabase Edge Function (cron) → Resend | Daily reminder email. |

**Read flow (server component):** request arrives → server component calls `features/charges/services/getTodayCharges(userId)` → Supabase query via `createServerClient` → returns data → renders.

**Write flow (client component):** user clicks button → calls server action in `features/charges/actions/markPaid.ts` → server validates session, writes to Supabase → returns refreshed data → UI revalidates.

**Access control:** every table has Row Level Security enforcing `auth.uid() = owner_id`. A compromised client cannot read or write another user's data. Server actions use the server Supabase client with the caller's auth cookie; no service-role key is ever exposed to the browser.

## 6. Data model

All tables are Postgres. All row PKs are UUIDs generated client-side. Timestamps are `TIMESTAMPTZ`. Dates (without time) are `DATE`. Money is `BIGINT` cents. Every table has `owner_id UUID` (FK to `auth.users.id`) and an RLS policy `USING (owner_id = auth.uid())`.

### 6.1 `clients`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Client-generated |
| `owner_id` | UUID NOT NULL | FK `auth.users.id`; RLS enforced |
| `name` | TEXT NOT NULL | |
| `phone_e164` | TEXT | For `wa.me` link, e.g. `+5511987654321` |
| `default_amount_cents` | BIGINT NOT NULL | Pre-fills new charges |
| `cycle_kind` | TEXT NOT NULL CHECK(`cycle_kind IN ('days','weeks','months')`) | |
| `cycle_every` | INTEGER NOT NULL CHECK(`cycle_every >= 1`) | |
| `cycle_anchor_date` | DATE NOT NULL | Reference day |
| `cycle_end_date` | DATE NULL | Optional cutoff |
| `notes` | TEXT | Free-form |
| `archived_at` | TIMESTAMPTZ NULL | Soft archive (keeps historical charges) |
| `created_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | Trigger-maintained |
| `deleted_at` | TIMESTAMPTZ NULL | Soft delete |

### 6.2 `charges`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `owner_id` | UUID NOT NULL | |
| `client_id` | UUID NOT NULL | FK `clients.id` |
| `due_date` | DATE NOT NULL | |
| `amount_cents` | BIGINT NOT NULL | Pre-filled from `clients.default_amount_cents`, editable per charge |
| `status` | TEXT NOT NULL CHECK(`status IN ('pending','paid','canceled')`) | **`overdue` is NOT stored** — derived on read (`status='pending'` AND `due_date < current_date`) |
| `paid_at` | TIMESTAMPTZ NULL | |
| `paid_amount_cents` | BIGINT NULL | Actual amount received (may differ from `amount_cents`) |
| `payment_method` | TEXT NULL CHECK(`payment_method IN ('pix','cash','transfer','other')`) | |
| `notes` | TEXT | Free-form |
| `created_at`, `updated_at`, `deleted_at` | TIMESTAMPTZ | |

Indexes: `(owner_id, due_date)`, `(owner_id, client_id)`, `(owner_id, status, due_date)`.

### 6.3 `attachments`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `owner_id` | UUID NOT NULL | |
| `charge_id` | UUID NOT NULL | FK `charges.id` |
| `storage_path` | TEXT NOT NULL | Path inside Supabase Storage bucket |
| `mime_type` | TEXT NOT NULL | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| `size_bytes` | BIGINT | After client-side compression for images |
| `original_name` | TEXT | |
| `created_at`, `deleted_at` | TIMESTAMPTZ | |

Supabase Storage bucket `attachments` uses a path convention `<owner_id>/<charge_id>/<uuid>.<ext>` with a storage RLS policy restricting reads/writes to `owner_id = auth.uid()`. Client-side compression target for images: max ~2000 px longest edge, ~85% JPEG quality. PDFs uploaded as-is. Max file size (post-compression) 10 MB.

### 6.4 `settings` (one row per user)

| Column | Type | Notes |
|---|---|---|
| `owner_id` | UUID PK | One row per user; creates on first sign-in via trigger |
| `message_template` | TEXT NOT NULL | Default PT-BR template with `{nome}`, `{valor}`, `{vencimento}` |
| `default_cycle_kind` | TEXT NOT NULL | Default for new clients (`'months'`) |
| `default_cycle_every` | INTEGER NOT NULL | Default 1 |
| `currency` | TEXT NOT NULL | Default `'BRL'` |
| `locale` | TEXT NOT NULL | Default `'pt-BR'` |
| `email_reminders_enabled` | BOOLEAN NOT NULL | Default `true` |
| `daily_reminder_time` | TIME NOT NULL | Default `'09:00'` |
| `daily_reminder_timezone` | TEXT NOT NULL | IANA TZ, default `'America/Sao_Paulo'` |
| `notify_only_if_any` | BOOLEAN NOT NULL | Default `true` (skip "0 hoje, 0 atraso" emails) |
| `updated_at` | TIMESTAMPTZ | |

Default message template (PT-BR):

```
Olá {nome}, tudo bem? Passando para lembrar da mensalidade de {valor} com vencimento em {vencimento}. Qualquer dúvida me avise. Obrigado!
```

### 6.5 Derived data

- **Today's charges:** `SELECT * FROM charges WHERE owner_id = auth.uid() AND due_date <= current_date AND status = 'pending'`, split into "today" and "overdue" groups in the service layer.
- **Monthly earnings:** `SUM(COALESCE(paid_amount_cents, amount_cents)) FROM charges WHERE owner_id = auth.uid() AND paid_at >= :monthStart AND paid_at < :nextMonthStart AND status = 'paid'`.
- **Outstanding for month:** `SUM(amount_cents) FROM charges WHERE owner_id = auth.uid() AND due_date >= :monthStart AND due_date < :nextMonthStart AND status = 'pending'`.
- **Rolling-window generation:** on sign-in and after any charge-mutating action, a server action checks each non-archived client: ensure at least **3** upcoming `pending` charges exist ahead of `current_date`, generated from the client's cycle rule. Capped by `cycle_end_date`.

### 6.6 Migrations and triggers

- SQL migrations live in `supabase/migrations/`, managed via the Supabase CLI (`supabase db push`).
- Triggers:
  - `set_updated_at` on every mutable table (touches `updated_at`).
  - `handle_new_user()` on `auth.users` insert — creates a `settings` row with defaults.
- Constraints: referential integrity on FK columns; CHECK constraints on enums (see column notes).
- Deletes: soft (`deleted_at = now()`) — never `DELETE FROM`, for data recovery and simpler reasoning.

## 7. Screens and navigation

Responsive layout. Mobile-first:

- **Mobile (default):** four-tab bottom navigation bar — **Hoje**, **Clientes**, **Relatórios**, **Ajustes**.
- **Desktop (`lg:` breakpoint and up):** side navigation with the same four sections plus the user's name + sign-out in the header.

### 7.1 Pages

- **Hoje (`/hoje`)** — dashboard.
  - Banner: current date; "X cobranças hoje · R$ Y,00"; red line "Valor a receber em atraso: R$ Z (N em atraso)".
  - Two grouped lists: "Em atraso" and "Hoje".
  - Row actions on mobile via long-press / on desktop via hover buttons: **Marcar pago**, **Notificar pelo Whatsapp**.
  - Tap row → charge detail.
- **Clientes (`/clientes`)** — searchable list; `+` button (FAB on mobile) to add a client.
  - Tap row → `/clientes/[id]`: client info + charge history + "Nova cobrança avulsa" action.
- **Relatórios (`/relatorios`)** — current-month banner + historical month list.
  - Tap a month → `/relatorios/[yyyy-mm]` with per-client breakdown.
- **Ajustes (`/ajustes`)** — Message template editor, email reminder (time + on/off), account (email shown, sign out, erase my data — double-confirmation), about, language.

### 7.2 Cobrança detail (`/cobrancas/[id]`)

- Client name + phone.
- Amount (inline-editable, resets to `clients.default_amount_cents` on client change).
- Due date + status pill (`pending`/`paid`/`canceled`, with derived `overdue` badge if applicable).
- Observations (multi-line free-form).
- Actions: **Marcar como pago** (opens modal), **Notificar pelo Whatsapp**, **Anexar comprovante**.
- Attachments grid (thumbnails for images, icon for PDFs).

### 7.3 Key interactions

- **Notificar pelo Whatsapp:** fills `{nome}`, `{valor}`, `{vencimento}` in the template, copies to clipboard, and opens `https://wa.me/<phone_no_plus>?text=<urlencoded>`. Same URL works on iOS Safari, Android Chrome, and desktop.
- **Marcar como pago:** modal with date picker (default today), received amount (default `amount_cents`), payment-method select, attach-receipt button. On confirm: writes `paid_at`, `paid_amount_cents`, `status='paid'`; server action triggers rolling-window top-up.
- **Anexar comprovante:** native file input. Images are compressed in-browser (e.g., `browser-image-compression`) before upload. Uploads go directly to Supabase Storage via signed URL.
- **PWA install hint:** banner shown once after first successful load, dismissible, with platform-aware instructions (Android Chrome: install button; iOS Safari: share sheet → "Add to Home Screen").

### 7.4 Mockups

Mockups of Hoje and charge detail (PT-BR) live in `.superpowers/brainstorm/*/content/screens-v2.html` (brainstorming artifact). Screen-level polish (copy, icons, spacing) is finalized during implementation.

## 8. Subsystems

### 8.1 Auth (`features/auth/`)

- Supabase Auth via `@supabase/ssr` (App Router-friendly helpers).
- Providers: email+password and Google OAuth (single redirect URL registered in Cloudflare Pages + Supabase).
- Session persisted in HTTP-only cookies; middleware protects all `(app)` routes.
- Account screen surfaces: current email, sign out, erase my data (invokes a dedicated server action that cascades deletions for the caller only).

### 8.2 Data access (`lib/supabase/`)

- Two client factories: `createServerClient()` for server components and server actions (reads cookies), `createBrowserClient()` for client components (auth refresh in browser).
- Typed query helpers generated from the database schema via `supabase gen types typescript`.
- Access rules: no service-role key is ever imported in code that runs in the browser. RLS is the source of truth; server actions run under the user's session, not service role.

### 8.3 Domain services (`features/<domain>/services/`)

Pure functions, no Supabase imports. Unit-testable with zero setup.

- `features/charges/services/cycle.ts` — `nextNDueDates(cycle, lastDate, n)`.
- `features/charges/services/template.ts` — `fillTemplate(template, { nome, valor, vencimento })`.
- `features/reports/services/aggregate.ts` — monthly sums given a charges array.
- `features/charges/services/classify.ts` — `classifyToday(charges, today)` → `{ today, overdue }`.

### 8.4 Server actions (`features/<domain>/actions/`)

Thin wrappers that validate the session, call services, and call Supabase. One file per operation for clarity: `createClient.ts`, `updateClient.ts`, `archiveClient.ts`, `markPaid.ts`, `cancelCharge.ts`, `attachReceipt.ts`, `saveTemplate.ts`, etc.

### 8.5 Daily reminder email (`supabase/functions/daily-reminder/`)

- Runs hourly via `pg_cron` (Supabase has this).
- Each run:
  1. Selects users whose `settings.daily_reminder_time` matches the current hour in their `daily_reminder_timezone`.
  2. For each, computes today + overdue counts in SQL.
  3. If `notify_only_if_any` and both counts are 0 → skip.
  4. Calls Resend API (server-side) to send the email with subject + body + deep link to `/hoje`.
- Observability: logs structured JSON per run (user ids, counts, send status); stored in Supabase Function logs.
- Email provider: **Resend** (chosen for clean API, generous free tier at 100 emails/day / 3000/month, well-documented). SendGrid is an alternative if Resend saturates.

### 8.6 Feature gate / billing (`features/billing/gate.ts`) — dormant in v1

- Hooks: `useIsPro()`, `useCanAddClient()` (client side); server equivalents `isPro(userId)`, `canAddClient(userId)`.
- v1 implementation: always returns `true`.
- UI already calls the gate at the right points:
  - "Adicionar cliente" button checks `useCanAddClient()`.
  - Ajustes screen reserves a "Plano" row (placeholder text in v1).
- Activation path (v2+): see §14.

### 8.7 i18n (`i18n/`)

- `next-intl`. All user-visible strings go through keys.
- v1 ships `pt-BR.json`. `en-US.json` is a deferred artifact.
- Locale switcher in Ajustes is hidden until a second language exists.
- Number + currency formatting via `Intl.NumberFormat` with `settings.locale` / `settings.currency`.

### 8.8 Attachments (`features/charges/services/uploadReceipt.ts`)

- Browser flow: `<input type="file" accept="image/*,application/pdf" capture="environment">` → if image, `browser-image-compression` applied → server action requests a signed upload URL → browser uploads directly to Supabase Storage → server action records the `attachments` row.
- Reads: `attachments` row has `storage_path`; the UI requests a signed download URL (time-limited) on demand.
- Multiple attachments per charge, displayed as thumbnail grid on the charge detail screen.

### 8.9 PWA (`public/manifest.json`, `app/sw.ts`)

- Web App Manifest: name, icons (512×512, 192×192, maskable), `theme_color`, `background_color`, `start_url = "/hoje"`, `display = "standalone"`.
- Service worker: cache static assets (pre-cache generated by `next-pwa` plugin), network-first for API calls.
- No offline mutations in v1 — mutations require network. The service worker's role is only to make cold loads faster and allow the PWA shell to render with the login screen even when network is slow.

## 9. Project structure

```
dojopay/
├── app/                              Next.js App Router
│   ├── (auth)/
│   │   ├── sign-in/page.tsx
│   │   └── sign-up/page.tsx
│   ├── (app)/                        Authed layout
│   │   ├── layout.tsx                Bottom tabs (mobile) / side nav (desktop)
│   │   ├── hoje/page.tsx
│   │   ├── clientes/
│   │   │   ├── page.tsx
│   │   │   ├── novo/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── editar/page.tsx
│   │   ├── cobrancas/[id]/page.tsx
│   │   ├── relatorios/
│   │   │   ├── page.tsx
│   │   │   └── [yyyymm]/page.tsx
│   │   └── ajustes/
│   │       ├── page.tsx
│   │       ├── template/page.tsx
│   │       ├── notificacoes/page.tsx
│   │       └── conta/page.tsx
│   ├── layout.tsx                    Root layout, providers
│   ├── page.tsx                      Landing; redirects to /hoje or /sign-in
│   └── globals.css
│
├── components/                       Reusable UI (shadcn/ui-based)
│   ├── ui/                           shadcn-generated primitives
│   ├── ChargeRow.tsx
│   ├── ClientRow.tsx
│   ├── MoneyField.tsx
│   ├── CycleEditor.tsx
│   ├── AttachmentGrid.tsx
│   └── EmptyState.tsx
│
├── features/                         Business logic per domain
│   ├── auth/
│   ├── clients/
│   │   ├── actions/
│   │   ├── services/
│   │   └── queries/
│   ├── charges/
│   │   ├── actions/
│   │   ├── services/
│   │   └── queries/
│   ├── reports/
│   ├── notifications/                Client-side consumers of email/flags
│   └── billing/
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                 createServerClient
│   │   ├── browser.ts                createBrowserClient
│   │   └── types.ts                  generated DB types
│   ├── date.ts
│   ├── money.ts
│   ├── uuid.ts
│   └── whatsapp.ts                   wa.me URL builder
│
├── i18n/
│   ├── request.ts                    next-intl config
│   └── messages/
│       └── pt-BR.json
│
├── supabase/
│   ├── config.toml                   Supabase CLI config
│   ├── migrations/                   Versioned SQL
│   │   └── 0001_init.sql
│   └── functions/
│       └── daily-reminder/
│           └── index.ts              Edge Function
│
├── public/
│   ├── manifest.json
│   ├── icons/                        512, 192, maskable
│   └── ...
│
├── tests/
│   ├── unit/                         Vitest — services, pure logic
│   └── e2e/                          Playwright — golden paths
│
├── docs/
│   ├── setup-guide.md                PT-BR (see §11)
│   └── superpowers/specs/
│       └── 2026-04-19-dojopay-design.md  (this file)
│
├── .env.example
├── .gitignore                         Includes `.superpowers/`, `.env.local`, `node_modules/`
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

**Module boundary rules:**
- `app/` only composes UI and calls server actions; no direct Supabase queries except through feature queries.
- `features/<domain>/services/` is pure — no imports from `lib/supabase/`.
- `lib/` has no feature-specific logic.

## 10. Tech stack

### 10.1 Code-level

| Area | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router | SSR + server actions + strong ecosystem |
| Language | TypeScript (strict) | Leverages user's existing TS experience |
| Styling | Tailwind CSS + shadcn/ui | Responsive-first utilities; accessible primitives; customizable |
| Auth client | `@supabase/ssr` | Cookie-based sessions in App Router |
| Forms | `react-hook-form` + `zod` | Consistent validation on client + server |
| State (client) | React Query (`@tanstack/react-query`) | Client-side cache for queries; pairs with server actions |
| Dates | `date-fns` + `date-fns-tz` | Cycle math, timezone-aware |
| i18n | `next-intl` | App Router-native, server + client |
| Image compression | `browser-image-compression` | Client-side JPEG/PNG resize before upload |
| PWA | `next-pwa` (or manual manifest + SW) | Add-to-home-screen + static asset cache |
| Tests | Vitest + Playwright | Unit + browser-level E2E |
| Lint/format | ESLint + Prettier + `tsc --noEmit` | Standard |

### 10.2 Hosted services (all free tier with commercial-use allowed)

| Service | Role | Free-tier relevance |
|---|---|---|
| **Cloudflare Pages** | Hosts the Next.js app (via `@cloudflare/next-on-pages`) | Free forever; unlimited bandwidth; commercial use permitted; preview URL per PR |
| **Supabase** | Postgres database, Auth, Storage, Edge Functions, `pg_cron` | Free tier permits commercial use. Caveat: project auto-pauses after ~7 days without traffic; the daily reminder cron keeps it awake. |
| **Resend** | Transactional email (daily reminder) | 100 emails/day, 3000/month; commercial use permitted |
| **GitHub Actions** | CI: lint, typecheck, unit tests | 2000 free minutes/month on public repos |

### 10.3 Runtime-environment note

Next.js on Cloudflare Pages runs under the Workers runtime (edge), which imposes a few constraints compared to a traditional Node server:

- Route handlers and server actions must use `export const runtime = 'edge'` (the adapter sets this by default).
- Some Node-only APIs are unavailable (parts of `fs`, native `crypto` bindings, streams with Node internals). We don't need any of these — Supabase REST/RPC, Resend HTTP API, and standard `fetch` all work on edge.
- Full compatibility with App Router features we use (server components, server actions, middleware, route handlers, streaming).

If a future feature requires Node-only APIs, the escape hatch is to move that one function to a Supabase Edge Function (Deno) or migrate hosting to a Node-capable host; no architectural change required.

## 11. Deliverable: `docs/setup-guide.md`

A PT-BR step-by-step guide for the developer, assuming no prior experience with Next.js, Supabase, or Cloudflare Pages. Required in v1. Contents:

1. Install Node.js LTS and pnpm (or npm).
2. Clone the repository; run `pnpm install`.
3. Create a Supabase project (free tier):
   - Enable email+password auth; configure email templates in PT-BR.
   - Add Google OAuth provider (Google Cloud Console client id/secret).
   - Create Storage bucket `attachments` (private).
   - Install Supabase CLI, then `supabase login` + `supabase link` to the project.
   - Apply migrations: `supabase db push`.
   - Trigger `handle_new_user` creates a `settings` row automatically on first sign-up.
4. Copy `.env.example` to `.env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; never committed; never exposed to the browser bundle)
   - `RESEND_API_KEY` (server-only)
   - `NEXT_PUBLIC_APP_URL`
5. Run locally: `pnpm dev` → `http://localhost:3000`. Verify sign-up, create a client, create a charge, mark paid.
6. Deploy to Cloudflare Pages:
   - Create a Cloudflare account (free).
   - Connect the GitHub repo in the Cloudflare dashboard → Pages → Create project.
   - Framework preset: **Next.js** (Cloudflare detects it and configures `@cloudflare/next-on-pages` for you); build command `pnpm run build:cf`; output directory `.vercel/output/static` (what the adapter produces).
   - Add environment variables in Cloudflare Pages project settings (same list as `.env.local`).
   - Production branch `main` → pushes auto-deploy; each PR gets a preview URL.
7. Configure Resend:
   - Create Resend account; for dev use the sandbox sender `onboarding@resend.dev`; for production verify your own domain.
   - Store the API key as a Supabase Function secret: `supabase secrets set RESEND_API_KEY=…`.
8. Deploy the daily-reminder Edge Function:
   - `supabase functions deploy daily-reminder`.
   - Schedule via `pg_cron`: hourly invocation that `POST`s to the function URL (internal bearer token). Example SQL in the repo under `supabase/migrations/`.
9. Custom domain (optional): add a domain to the Cloudflare Pages project (DNS automatically configured if the domain is already on Cloudflare; otherwise follow the CNAME instructions).
10. Troubleshooting: cookies blocked in incognito, OAuth redirect mismatch (Cloudflare preview URLs need to be whitelisted in Supabase Auth settings), Storage CORS, RLS recursion; where to read logs (Cloudflare Pages deployment logs, Cloudflare Workers request logs, Supabase Functions logs, Supabase SQL logs).
11. Pre-launch checklist:
   - Icons + theme colors in `manifest.json`
   - PWA installability verified via Chrome DevTools Lighthouse audit
   - Privacy policy + Terms URLs (hosted as simple pages in the same app)
   - Email reminder tested end-to-end (subscribe, wait for next cron slot, receive)

This document is versioned with the code and updated whenever the infra process changes.

## 12. Distribution and deployment

- **v1 target:** a single public URL on Cloudflare Pages (e.g. `dojopay.pages.dev`; custom domain when desired, e.g. `dojopay.app`).
- **Environments:** Production (main branch) and Preview (every PR). Cloudflare Pages creates both automatically from the connected GitHub repo.
- **CI:** GitHub Actions runs lint, typecheck, and Vitest on PRs. Cloudflare Pages runs its own build on push; we do not duplicate the build in CI.
- **Database changes:** SQL migrations in `supabase/migrations/` reviewed via PR; applied to the Supabase project with `supabase db push` from a maintainer's machine (or a dedicated CI job using the Supabase CLI + service role token).
- **Onboarding the trainer:** send the production URL via WhatsApp. First visit → sign-up. After first successful load, a dismissible banner suggests "Add to Home Screen."

## 13. Testing strategy (v1)

Pragmatic, high-ROI coverage.

- **Unit (Vitest):**
  - `features/charges/services/cycle.ts` — rolling-window generation for monthly/weekly/custom cycles; edge cases: end-of-month (day 31), year boundary, `cycle_end_date`.
  - `features/charges/services/template.ts` — placeholder filling, missing-field fallback.
  - `features/charges/services/classify.ts` — today vs. overdue split at exact midnight boundaries.
  - `features/reports/services/aggregate.ts` — monthly sums with and without partial payments.
  - `lib/money.ts`, `lib/date.ts`, `lib/whatsapp.ts`.
- **E2E (Playwright):** one test per golden path against the Cloudflare Pages preview URL of the PR (or a dedicated Supabase test project):
  - Sign up → create client → create charge → mark paid → see it in Relatórios.
  - Notificar pelo Whatsapp → URL is built correctly; clipboard contains template.
  - Attach receipt → thumbnail shown on charge detail.
- **CI:** three GitHub Actions jobs (lint, typecheck, vitest) on every PR; Playwright run on nightly schedule against preview deployments.

## 14. Deferred work (v2+)

Each item has scaffolding or a clean extension point in v1 but is **not implemented** until a later version. Structure: *what*, *where v1 leaves a hook*, *what it takes to implement*, *dependencies*.

### 14.1 Web Push notifications

- **What:** real-time browser notifications ("você acabou de ganhar uma nova cobrança em atraso") beyond the daily email.
- **Where v1 leaves a hook:** service worker already registered; user already authenticated.
- **What it takes:** VAPID keys; subscribe endpoint; store push subscriptions per user; trigger on relevant events. iOS Safari 16.4+ requires the PWA to be installed to receive push; Android Chrome works on web too.
- **Dependencies:** none beyond infra setup; coexists with email.

### 14.2 Feature gate activation (paywall)

- **What:** enforce a free-tier client limit and enable a Pro subscription.
- **Where v1 leaves a hook:** `features/billing/gate.ts` stubs; UI calls the gate at the right points; Ajustes reserves a "Plano" row.
- **What it takes:**
  1. Stripe account; create products + price ids.
  2. Stripe Checkout for subscription start; Billing Portal for management.
  3. Webhook (Supabase Edge Function) updates `subscription_status` table on `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
  4. `useIsPro` reads from `subscription_status`.
  5. Paywall UI component.
- **Dependencies:** business decision on tier cap; Stripe business account.

### 14.3 English localization

- **What:** ship `en-US` alongside `pt-BR`, unlocking markets outside Brazil.
- **Where v1 leaves a hook:** all strings go through `next-intl` keys; locale switcher designed but hidden.
- **What it takes:** translation pass on `pt-BR.json` → `en-US.json`; unhide locale switcher in Ajustes; verify date/currency formatting.

### 14.4 Offline mode with local cache

- **What:** let the user view lists and recent details when offline, queue mutations for sync.
- **Where v1 leaves a hook:** service worker in place; the architecture doesn't block offline — it just doesn't optimize for it.
- **What it takes:** IndexedDB cache (Dexie); React Query offline persister; mutation queue with conflict handling; clear UI for "this change is pending."

### 14.5 Native Android / iOS apps via Capacitor

- **What:** wrap the web app in a native shell for app-store distribution, deeper OS integration, and native push notifications.
- **Where v1 leaves a hook:** codebase is pure web; a Capacitor wrapper reuses ~95% without modification.
- **What it takes:** Capacitor project scaffold; native-only features (local notifications, deep linking) using Capacitor plugins; store accounts (Google Play US$25 one-time; Apple Developer US$99/year).
- **Trigger:** user demand for a store listing or a feature that requires native (e.g., background fetch).

### 14.6 Multiple message templates

- **What:** distinct templates for first reminder, overdue, and payment-received receipt; app picks based on charge status.
- **Where v1 leaves a hook:** single `message_template` in `settings`.
- **What it takes:** schema extension (move to a related table or JSON array); template editor UI for multiple entries; selection logic.

### 14.7 Per-client documents

- **What:** attach documents (contract, ID photo) to clients, independent of charges.
- **Where v1 leaves a hook:** storage infra already exists; `attachments` generalizes easily.
- **What it takes:** new `client_attachments` table; section in client detail UI.

### 14.8 Reports: date-range filter + CSV export

- **What:** arbitrary date-range queries, export to CSV/PDF for accounting.
- **Where v1 leaves a hook:** aggregator accepts arbitrary ranges.
- **What it takes:** UI for range picker; server action streams CSV; download via `Content-Disposition`.

### 14.9 UI for partial-payment scenarios

- **What:** clearer presentation when `paid_amount_cents` ≠ `amount_cents`, outstanding-balance rollup per client.
- **Where v1 leaves a hook:** schema already supports partial amounts.
- **What it takes:** client detail shows paid vs. charged deltas; optional "carry forward" behavior.

### 14.10 Per-user reminder time with minute-level precision

- **What:** honor not just hour but exact minute (e.g., 09:27) for daily reminder.
- **Where v1 leaves a hook:** `daily_reminder_time` column already stores `TIME`.
- **What it takes:** change `pg_cron` schedule to run every 5 minutes instead of hourly; filter by time window.

---

## Appendix A — Decisions log

| # | Decision | Rationale |
|---|---|---|
| A1 | Generic `clients` entity instead of `students` | App is reusable beyond BJJ trainer; naming should reflect pattern, not example |
| A2 | Rolling window of 3 upcoming charges (not lazy generation) | Operator needs forward visibility into upcoming dues |
| A3 | `overdue` computed on read, not persisted | Avoids periodic update job; always accurate |
| A4 | Money as integer cents | Standard; avoids float precision bugs |
| A5 | Client-generated UUIDs | Stable IDs before the server round-trip; enables optimistic writes |
| A6 | Supabase for auth + DB + storage | Single platform; generous free tier; RLS simplifies multi-user |
| A7 | `pt-BR` only in v1 with full i18n scaffolding | Focuses on initial market, no refactor when English is added |
| A8 | Daily email reminder instead of local/push notifications | Works on 100% of devices (incl. iOS) without PWA install; zero platform dependency |
| A9 | Amount per charge editable, pre-filled from client default | Trainer flexibility; "not all billings have the exact same value" |
| A10 | Attachments: image-primary, PDFs allowed; neutral UI wording | Most receipts are WhatsApp screenshots; PDFs still supported via same picker |
| A11 | Delivery as a responsive web app (PWA) | One URL reaches any modern browser (mobile or desktop); simpler architecture; user's TS skills transfer directly |
| A12 | Next.js App Router + Supabase + Cloudflare Pages stack | Modern Next.js features (server actions, server components) + a hosting path whose free tier explicitly allows commercial use |
| A13 | Row Level Security as the authorization mechanism | Enforced in Postgres; no way for the client to read another user's data even if client code is compromised |
| A14 | Soft delete everywhere (`deleted_at`), no `DELETE FROM` | Data recovery, cleaner history, simpler reasoning |
| A15 | Free tiers whose licenses allow commercial use | Cost structure survives v2 subscription activation without migration; avoids Vercel Hobby's non-commercial clause |

## Appendix B — Glossary

- **Cycle rule:** the tuple (`cycle_kind`, `cycle_every`, `cycle_anchor_date`, optional `cycle_end_date`) that defines when a client owes charges.
- **Rolling window:** the count of future pending charges always materialized per client (v1: 3).
- **RLS (Row Level Security):** Postgres feature that restricts which rows a query can see, based on the current session's identity. Supabase uses this to isolate user data without separate databases.
- **Server action:** a Next.js function marked `"use server"` that runs on the server, called from client components. Replaces traditional REST endpoints for internal mutations.
- **PWA (Progressive Web App):** a web app that can be added to the home screen, uses a service worker, and behaves like a native app shell.
- **Edge Function:** a Supabase-hosted serverless function; used here for the daily reminder email cron job.
- **Deep link:** a URL that opens the app at a specific screen, e.g. `https://dojopay.app/hoje`. On mobile web, deep links are just normal URLs.
- **Feature gate:** a hook/function returning whether a feature is accessible to the current user; used for free-tier limits.
