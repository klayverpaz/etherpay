# EtherPay Plan 3 — WhatsApp, Attachments, Reports, Settings, Nav Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the operator-productivity surface on top of the Plan 2 charges engine: tap a row to notify the client via WhatsApp with a pre-filled PT-BR message, attach receipts to paid charges, see monthly totals at a glance, edit the message template and reminder preferences in Ajustes, and navigate the app via a proper bottom-tab (mobile) / side-nav (desktop) layout with all four sections.

**Architecture:** Pure-function domain services (`template.ts`, `aggregate.ts`) handle message filling and monthly aggregation — TDD with Vitest. A new `features/settings/` module exposes a single-row `getSettings()` query and update actions. Attachments upload directly from the browser via `@supabase/ssr`'s browser client (authenticated via session cookie; storage RLS enforces `owner = auth.uid()`), after client-side image compression with `browser-image-compression`; a server action records the `attachments` row. Reports aggregate paid charges in JS via the pure `aggregate.ts` helper on top of a plain Supabase query. The `(app)` layout is rewritten around a responsive `Nav` component: bottom tabs on mobile, left sidebar on `lg:` and up.

**Tech Stack (already pinned by Plans 1–2):** Next.js 14 App Router, TypeScript strict, pnpm, Tailwind v3 + shadcn/ui v2.1.8 (Radix), Supabase (Postgres + Auth + Storage), `@supabase/ssr`, `react-hook-form` + zod v4 (`standardSchemaResolver`), `date-fns`, Vitest, Playwright. New dependency added by this plan: `browser-image-compression`.

**Reference spec:** `docs/superpowers/specs/2026-04-19-etherpay-design.md` — §4 feature set (WhatsApp, attachments, reports, settings), §6.4 `settings` table, §7.1 all four pages, §7.2 charge detail (attachments grid), §7.3 Notificar pelo Whatsapp + Anexar comprovante, §8.3 domain services (`template.ts`, `aggregate.ts`), §8.7 i18n scaffolding, §8.8 attachments flow.

**Build on Plans 1 + 2:**

- Plan 1: `docs/superpowers/plans/2026-04-19-plan-1-foundation.md` — schema, RLS, storage bucket, auth.
- Plan 2: `docs/superpowers/plans/2026-04-19-plan-2-charges-hoje.md` — charges engine, Hoje, charge detail.
- Do NOT reintroduce packages already installed; do NOT run `shadcn@latest` (would break Tailwind v3 / Radix stack).

## Scope of Plan 3

- Pure services: `features/charges/services/template.ts` (fill `{nome}`, `{valor}`, `{vencimento}` — TDD), `features/reports/services/aggregate.ts` (monthly sums + per-client breakdown — TDD).
- `features/settings/`: types, queries (`getSettings`), schemas, update actions (`updateTemplateAction`, `updateReminderAction`, `eraseMyDataAction`).
- WhatsApp Notificar action from Hoje row + charge detail: reads template from settings, fills, copies to clipboard, opens `wa.me/<phone>?text=<urlencoded>`.
- Row action dropdown on Hoje replacing the Plan 2 single "Pago" button — now offers "Marcar pago" + "Notificar pelo Whatsapp".
- Attachments: client-side image compression + upload via browser Supabase client, `attachReceiptAction` records the row, `AttachmentsGrid` displays thumbnails (images) / icons (PDFs), `deleteAttachmentAction` removes one, full wire into charge detail.
- Reports: `/relatorios` (current-month banner + historical month list), `/relatorios/[yyyymm]` (per-client breakdown for a month).
- Ajustes: `/ajustes` hub + `/ajustes/template` editor + `/ajustes/notificacoes` (reminder time + toggle — persists for Plan 4 to consume) + `/ajustes/conta` (email, sign out, erase my data with double-confirm).
- Nav redesign: `components/Nav.tsx` renders bottom tabs on mobile (`< lg`), sidebar on `lg:` and up; `(app)/layout.tsx` restructured to host the 4-tab nav in both orientations. TopBar trims to brand + (desktop-only) email + sign-out.
- Client detail (`/clientes/[id]`) grows a charge-history section and a "Nova cobrança avulsa" button that opens a dialog and calls `createOneOffChargeAction`.
- Playwright E2E coverage for the three new golden paths: Notificar copy+open, Relatórios totals after a mark-paid, Ajustes template edit persists.

## Not in Plan 3 (covered by Plan 4 or later)

- Daily reminder email sending (the `settings.daily_reminder_time` row is edited here; the Supabase Edge Function that _sends_ the email is Plan 4).
- PWA (manifest + service worker) — Plan 4.
- `next-intl` keyed strings — Plan 4 (v1 ships hardcoded PT-BR copy; scaffolding already in place).
- Feature-gate UI (paywall / Plano row wiring) — the Ajustes hub has a static "Plano: Gratuito" placeholder row but does not invoke `useIsPro()` yet.
- Cloudflare Pages deployment configuration, `docs/setup-guide.md` — Plan 4.
- Client search on `/clientes` — deferred; list is short enough in v1.
- Date-range filters or CSV export on Relatórios — deferred per spec §14.8.

## Conventions used throughout

- Commit messages follow Conventional Commits (`feat:`, `test:`, `chore:`, `docs:`, `refactor:`, `style:`).
- Each task ends with a commit. Do NOT batch across tasks.
- Pure services are TDD: failing test first, run it, implement, run again, commit.
- `pnpm typecheck` after each file change, before committing.
- No new migrations. All schema needed for Plan 3 exists: `settings`, `attachments`, `charges`, `clients` tables plus `attachments` storage bucket and its RLS (Plan 1 migration 0004).
- Money is `BIGINT` cents; dates are ISO `"YYYY-MM-DD"` strings; timestamps are ISO with timezone. `paid_at` stored as `${paid_date}T12:00:00+00:00` (Plan 2 convention).
- `paid_amount_cents` coalesces to `amount_cents` in aggregations if null (per spec §6.5).
- Attachments stored at path `<owner_id>/<charge_id>/<attachment_id>.<ext>` inside bucket `attachments`.
- Image compression target: longest edge 2000 px, quality 0.85, max output size 1 MB (per spec §6.3); PDFs uploaded unmodified.
- RLS + storage policies from Plan 1 are the only authorization layer. All server actions additionally call `supabase.auth.getUser()` as defense-in-depth parity (Plan 2 post-review convention).

---

## Phase 0 — Settings module (prerequisite for WhatsApp and Ajustes)

### Task 1: Settings types and queries

**Files:**

- Create: `features/settings/types.ts`, `features/settings/queries.ts`

- [ ] **Step 1: Types**

Create `features/settings/types.ts`:

```typescript
import type { CycleKind } from "@/features/clients/types";

export interface Settings {
  owner_id: string;
  message_template: string;
  default_cycle_kind: CycleKind;
  default_cycle_every: number;
  currency: string;
  locale: string;
  email_reminders_enabled: boolean;
  daily_reminder_time: string; // "HH:MM:SS"
  daily_reminder_timezone: string;
  notify_only_if_any: boolean;
  updated_at: string;
}
```

- [ ] **Step 2: Queries**

Create `features/settings/queries.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import type { Settings } from "./types";

export async function getSettings(): Promise<Settings | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("settings").select("*").maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Settings | null) ?? null;
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add features/settings
git commit -m "feat(settings): types and query"
```

---

### Task 2: Settings schemas and update actions

**Files:**

- Create: `features/settings/schema.ts`, `features/settings/actions.ts`

- [ ] **Step 1: Schema**

Create `features/settings/schema.ts`:

```typescript
import { z } from "zod";

export const updateTemplateInputSchema = z.object({
  message_template: z.string().min(1, "Template não pode ficar vazio").max(2000),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateInputSchema>;

export const updateReminderInputSchema = z.object({
  email_reminders_enabled: z.boolean(),
  daily_reminder_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  notify_only_if_any: z.boolean(),
});

export type UpdateReminderInput = z.infer<typeof updateReminderInputSchema>;
```

- [ ] **Step 2: Actions**

Create `features/settings/actions.ts`:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabase } from "@/lib/supabase/server";
import { updateReminderInputSchema, updateTemplateInputSchema } from "./schema";

export async function updateTemplateAction(input: unknown) {
  const parsed = updateTemplateInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("settings")
    .update({ message_template: parsed.data.message_template })
    .eq("owner_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/ajustes");
  revalidatePath("/ajustes/template");
  return { success: true };
}

export async function updateReminderAction(input: unknown) {
  const parsed = updateReminderInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("settings")
    .update({
      email_reminders_enabled: parsed.data.email_reminders_enabled,
      daily_reminder_time: parsed.data.daily_reminder_time,
      notify_only_if_any: parsed.data.notify_only_if_any,
    })
    .eq("owner_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/ajustes");
  revalidatePath("/ajustes/notificacoes");
  return { success: true };
}

/**
 * Hard-deletes all charges (which cascade-deletes attachment rows),
 * all clients, and all storage files under `<user.id>/`. Resets the
 * user's settings row to defaults. Signs out and redirects to /sign-in.
 * Auth account is intentionally preserved.
 */
export async function eraseMyDataAction() {
  const supabase = createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error: chargesErr } = await supabase.from("charges").delete().eq("owner_id", user.id);
  if (chargesErr) return { error: chargesErr.message };

  const { error: clientsErr } = await supabase.from("clients").delete().eq("owner_id", user.id);
  if (clientsErr) return { error: clientsErr.message };

  const { data: files } = await supabase.storage.from("attachments").list(user.id, {
    limit: 1000,
  });
  if (files && files.length > 0) {
    const paths = files.map((f) => `${user.id}/${f.name}`);
    await supabase.storage.from("attachments").remove(paths);
  }

  await supabase
    .from("settings")
    .update({
      message_template:
        "Olá {nome}, tudo bem? Passando para lembrar da mensalidade de {valor} com vencimento em {vencimento}. Qualquer dúvida me avise. Obrigado!",
      email_reminders_enabled: true,
      daily_reminder_time: "09:00",
      notify_only_if_any: true,
    })
    .eq("owner_id", user.id);

  await supabase.auth.signOut();

  revalidatePath("/");
  redirect("/sign-in");
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add features/settings/schema.ts features/settings/actions.ts
git commit -m "feat(settings): update actions and erase-my-data"
```

---

## Phase 1 — Template service + WhatsApp notifier

### Task 3: `features/charges/services/template.ts` (TDD)

**Files:**

- Create: `features/charges/services/template.ts`, `tests/unit/features/charges/services/template.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/features/charges/services/template.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { fillTemplate } from "@/features/charges/services/template";

describe("fillTemplate", () => {
  it("replaces all three placeholders", () => {
    const out = fillTemplate("Olá {nome}, vence {vencimento}, valor {valor}.", {
      nome: "João",
      valor: "R$ 150,00",
      vencimento: "19/04/2026",
    });
    expect(out).toBe("Olá João, vence 19/04/2026, valor R$ 150,00.");
  });

  it("replaces multiple occurrences of the same placeholder", () => {
    const out = fillTemplate("{nome} ({nome})", {
      nome: "Ana",
      valor: "",
      vencimento: "",
    });
    expect(out).toBe("Ana (Ana)");
  });

  it("leaves unknown placeholders untouched", () => {
    const out = fillTemplate("Olá {nome}, vence {due}.", {
      nome: "Ana",
      valor: "X",
      vencimento: "Y",
    });
    expect(out).toBe("Olá Ana, vence {due}.");
  });

  it("returns the template unchanged when it has no placeholders", () => {
    expect(fillTemplate("sem variáveis", { nome: "a", valor: "b", vencimento: "c" })).toBe(
      "sem variáveis",
    );
  });

  it("does not substitute braces inside placeholder values", () => {
    const out = fillTemplate("{nome}", {
      nome: "{valor}",
      valor: "R$ 9,99",
      vencimento: "",
    });
    expect(out).toBe("{valor}");
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails**

```bash
pnpm test tests/unit/features/charges/services/template.test.ts
```

Expected: fails with "Cannot find module '@/features/charges/services/template'".

- [ ] **Step 3: Implement**

Create `features/charges/services/template.ts`:

```typescript
export interface TemplateVars {
  nome: string;
  valor: string;
  vencimento: string;
}

export function fillTemplate(template: string, vars: TemplateVars): string {
  let out = "";
  let i = 0;
  while (i < template.length) {
    if (template[i] === "{") {
      const end = template.indexOf("}", i + 1);
      if (end !== -1) {
        const key = template.slice(i + 1, end);
        if (key === "nome" || key === "valor" || key === "vencimento") {
          out += vars[key];
          i = end + 1;
          continue;
        }
      }
    }
    out += template[i];
    i += 1;
  }
  return out;
}
```

- [ ] **Step 4: Run the test, confirm it passes**

```bash
pnpm test tests/unit/features/charges/services/template.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add features/charges/services/template.ts tests/unit/features/charges/services/template.test.ts
git commit -m "feat(charges): template fill service"
```

---

### Task 4: `WhatsAppButton` client component

**Files:**

- Create: `components/WhatsAppButton.tsx`

- [ ] **Step 1: Create the component**

Create `components/WhatsAppButton.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatBRL } from "@/lib/money";
import { isoToBRDate } from "@/lib/date";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { fillTemplate } from "@/features/charges/services/template";

type Props = {
  template: string;
  clientName: string;
  clientPhone: string | null;
  amountCents: number;
  dueDateISO: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  label?: string;
};

export function WhatsAppButton({
  template,
  clientName,
  clientPhone,
  amountCents,
  dueDateISO,
  variant = "outline",
  size = "sm",
  label = "WhatsApp",
}: Props) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!clientPhone) {
      toast.error("Este cliente não tem telefone cadastrado.");
      return;
    }
    const text = fillTemplate(template, {
      nome: clientName,
      valor: formatBRL(amountCents),
      vencimento: isoToBRDate(dueDateISO),
    });
    const url = buildWhatsAppUrl(clientPhone, text);
    if (!url) {
      toast.error("Telefone inválido.");
      return;
    }
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        // clipboard write can fail in some browsers without user gesture permission — ignore
      }
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Mensagem copiada. Abrindo WhatsApp…");
    });
  }

  return (
    <Button type="button" variant={variant} size={size} disabled={pending} onClick={onClick}>
      {label}
    </Button>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add components/WhatsAppButton.tsx
git commit -m "feat(charges): whatsapp notifier button"
```

---

### Task 5: Row action dropdown on Hoje

**Files:**

- Create: `components/ChargeRowActions.tsx`
- Modify: `app/(app)/hoje/page.tsx`, `app/(app)/cobrancas/[id]/page.tsx`

- [ ] **Step 1: Create the dropdown component**

Create `components/ChargeRowActions.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatBRL } from "@/lib/money";
import { isoToBRDate } from "@/lib/date";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { fillTemplate } from "@/features/charges/services/template";
import { MarkPaidDialog } from "@/components/MarkPaidDialog";

type Props = {
  chargeId: string;
  amountCents: number;
  dueDateISO: string;
  clientName: string;
  clientPhone: string | null;
  template: string;
};

export function ChargeRowActions({
  chargeId,
  amountCents,
  dueDateISO,
  clientName,
  clientPhone,
  template,
}: Props) {
  const [markPaidOpen, setMarkPaidOpen] = useState(false);

  function onNotify() {
    if (!clientPhone) {
      toast.error("Este cliente não tem telefone cadastrado.");
      return;
    }
    const text = fillTemplate(template, {
      nome: clientName,
      valor: formatBRL(amountCents),
      vencimento: isoToBRDate(dueDateISO),
    });
    const url = buildWhatsAppUrl(clientPhone, text);
    if (!url) {
      toast.error("Telefone inválido.");
      return;
    }
    navigator.clipboard.writeText(text).catch(() => undefined);
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Mensagem copiada. Abrindo WhatsApp…");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Ações
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setMarkPaidOpen(true)}>Marcar pago</DropdownMenuItem>
          <DropdownMenuItem onSelect={onNotify}>Notificar pelo Whatsapp</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MarkPaidDialog
        chargeId={chargeId}
        defaultAmountCents={amountCents}
        open={markPaidOpen}
        onOpenChange={setMarkPaidOpen}
        trigger={null}
      />
    </>
  );
}
```

- [ ] **Step 2: Extend `MarkPaidDialog` to accept a controlled `open`**

Open `components/MarkPaidDialog.tsx`. Change the `Props` type and component signature to support both trigger-driven (existing) and controlled (new) usage.

Replace the `type Props = ...` block with:

```tsx
type Props = {
  chargeId: string;
  defaultAmountCents: number;
  trigger: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};
```

Replace the component opening lines (up to and including `const [pending, startTransition] = useTransition();`) with:

```tsx
export function MarkPaidDialog({
  chargeId,
  defaultAmountCents,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [paidDate, setPaidDate] = useState(formatISODate(new Date()));
  const [amountDisplay, setAmountDisplay] = useState(formatBRL(defaultAmountCents));
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [pending, startTransition] = useTransition();
```

Then, in the returned JSX, replace this line:

```tsx
<DialogTrigger asChild>{trigger}</DialogTrigger>
```

with:

```tsx
{
  trigger !== null && <DialogTrigger asChild>{trigger}</DialogTrigger>;
}
```

- [ ] **Step 3: Wire the dropdown into `/hoje`**

Open `app/(app)/hoje/page.tsx`.

Replace the imports block's `MarkPaidDialog` import with:

```tsx
import { ChargeRowActions } from "@/components/ChargeRowActions";
```

Add the settings fetch below the existing `topUpAllClients()` and `listTodayAndOverdueCharges` calls — before the `todayTotal` calculation:

```tsx
import { getSettings } from "@/features/settings/queries";
```

At the top of `HojePage`, after loading rows, add:

```tsx
const settings = await getSettings();
const template = settings?.message_template ?? "";
```

Replace both `<MarkPaidDialog ... trigger={<Button size="sm" variant="outline">Pago</Button>} />` usages (in the "Em atraso" and "Hoje" lists) with:

```tsx
<ChargeRowActions
  chargeId={charge.id}
  amountCents={charge.amount_cents}
  dueDateISO={charge.due_date}
  clientName={charge.client.name}
  clientPhone={charge.client.phone_e164}
  template={template}
/>
```

Remove the unused `MarkPaidDialog` and `Button` imports if they become orphaned (keep `Button` — still used by the EmptyState action).

- [ ] **Step 4: Wire a WhatsApp button into the charge detail page**

Open `app/(app)/cobrancas/[id]/page.tsx`.

Add imports:

```tsx
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { getSettings } from "@/features/settings/queries";
```

After the `const isOverdue = ...` line, add:

```tsx
const settings = await getSettings();
const template = settings?.message_template ?? "";
```

In the pending-status JSX, inside the `<div className="grid grid-cols-2 gap-3 pt-2">`, keep MarkPaidDialog + Cancel. Below that grid, add a full-width notify button:

```tsx
<WhatsAppButton
  template={template}
  clientName={charge.client.name}
  clientPhone={charge.client.phone_e164}
  amountCents={charge.amount_cents}
  dueDateISO={charge.due_date}
  variant="outline"
  size="default"
  label="Notificar pelo Whatsapp"
/>
```

Wrap the existing 2-column grid and the new button in a parent `<div className="space-y-3">` so both layouts stack nicely.

- [ ] **Step 5: Typecheck, E2E-safe smoke check, commit**

```bash
pnpm typecheck
pnpm build
```

Both must exit 0.

```bash
git add components/ChargeRowActions.tsx components/MarkPaidDialog.tsx "app/(app)/hoje/page.tsx" "app/(app)/cobrancas"
git commit -m "feat(charges): whatsapp row action and detail-page notifier"
```

---

## Phase 2 — Attachments

### Task 6: Install `browser-image-compression` and create compression helper

**Files:**

- Modify: `package.json` (via pnpm)
- Create: `features/charges/services/compressImage.ts`

- [ ] **Step 1: Install**

```bash
pnpm add browser-image-compression
```

- [ ] **Step 2: Create the helper**

Create `features/charges/services/compressImage.ts`:

```typescript
import imageCompression from "browser-image-compression";

export async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 2000,
      useWebWorker: true,
      initialQuality: 0.85,
    });
    return compressed;
  } catch {
    return file;
  }
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add features/charges/services/compressImage.ts package.json pnpm-lock.yaml
git commit -m "feat(charges): browser image compression helper"
```

---

### Task 7: `attachReceiptAction` + `deleteAttachmentAction` server actions

**Files:**

- Modify: `features/charges/actions.ts`
- Create: `features/charges/schema-attachments.ts`

- [ ] **Step 1: Add the attachment schemas**

Create `features/charges/schema-attachments.ts`:

```typescript
import { z } from "zod";

export const attachReceiptInputSchema = z.object({
  charge_id: z.string().uuid(),
  attachment_id: z.string().uuid(),
  storage_path: z.string().min(1),
  mime_type: z.string().min(1),
  size_bytes: z.number().int().nonnegative(),
  original_name: z.string().min(1).max(255),
});

export type AttachReceiptInput = z.infer<typeof attachReceiptInputSchema>;
```

- [ ] **Step 2: Append the two actions to `features/charges/actions.ts`**

Open `features/charges/actions.ts`. After the existing import line:

```typescript
import { markPaidInputSchema, updateChargeInputSchema } from "./schema";
```

Add:

```typescript
import { attachReceiptInputSchema } from "./schema-attachments";
```

At the end of the file, append:

```typescript
export async function attachReceiptAction(input: unknown) {
  const parsed = attachReceiptInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: chargeRow, error: readErr } = await supabase
    .from("charges")
    .select("id")
    .eq("id", parsed.data.charge_id)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!chargeRow) return { error: "Cobrança não encontrada." };

  const { error: insertErr } = await supabase.from("attachments").insert({
    id: parsed.data.attachment_id,
    owner_id: user.id,
    charge_id: parsed.data.charge_id,
    storage_path: parsed.data.storage_path,
    mime_type: parsed.data.mime_type,
    size_bytes: parsed.data.size_bytes,
    original_name: parsed.data.original_name,
  });
  if (insertErr) return { error: insertErr.message };

  revalidatePath(`/cobrancas/${parsed.data.charge_id}`);
  return { success: true };
}

export async function deleteAttachmentAction(attachmentId: string) {
  const supabase = createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: row, error: readErr } = await supabase
    .from("attachments")
    .select("charge_id, storage_path")
    .eq("id", attachmentId)
    .maybeSingle();
  if (readErr) return { error: readErr.message };
  if (!row) return { error: "Anexo não encontrado." };

  await supabase.storage.from("attachments").remove([row.storage_path]);

  const { error: delErr } = await supabase.from("attachments").delete().eq("id", attachmentId);
  if (delErr) return { error: delErr.message };

  revalidatePath(`/cobrancas/${row.charge_id}`);
  return { success: true };
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add features/charges/schema-attachments.ts features/charges/actions.ts
git commit -m "feat(charges): attach and delete receipt actions"
```

---

### Task 8: Attachments queries and types

**Files:**

- Modify: `features/charges/types.ts`
- Modify: `features/charges/queries.ts`

- [ ] **Step 1: Add the Attachment type**

Open `features/charges/types.ts`. Append after the existing types:

```typescript
export interface Attachment {
  id: string;
  owner_id: string;
  charge_id: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number | null;
  original_name: string | null;
  created_at: string;
  deleted_at: string | null;
}
```

- [ ] **Step 2: Add `listAttachmentsForCharge` and `signedUrlForAttachment`**

Open `features/charges/queries.ts`. Append at the end:

```typescript
import type { Attachment } from "./types";

export async function listAttachmentsForCharge(chargeId: string): Promise<Attachment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("charge_id", chargeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Attachment[];
}

export async function signedUrlForAttachment(storagePath: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("attachments")
    .createSignedUrl(storagePath, 300);
  if (error) return null;
  return data?.signedUrl ?? null;
}
```

Note: the `Attachment` import must be hoisted to the top imports block. Move `import type { Attachment } from "./types";` next to the existing `import type { Charge, ChargeWithClient } from "./types";` line, combining into:

```typescript
import type { Attachment, Charge, ChargeWithClient } from "./types";
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add features/charges/types.ts features/charges/queries.ts
git commit -m "feat(charges): attachment type and queries"
```

---

### Task 9: `ReceiptUploadButton` + `AttachmentsGrid` components

**Files:**

- Create: `components/ReceiptUploadButton.tsx`, `components/AttachmentsGrid.tsx`

- [ ] **Step 1: ReceiptUploadButton**

Create `components/ReceiptUploadButton.tsx`:

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { newId } from "@/lib/uuid";
import { compressImageIfNeeded } from "@/features/charges/services/compressImage";
import { attachReceiptAction } from "@/features/charges/actions";

type Props = {
  chargeId: string;
  ownerId: string;
};

function extensionFromMime(mime: string, fallback: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return fallback || "bin";
}

export function ReceiptUploadButton({ chargeId, ownerId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const processed = await compressImageIfNeeded(file);
      const attachmentId = newId();
      const originalExt = (file.name.split(".").pop() ?? "").toLowerCase();
      const ext = extensionFromMime(processed.type, originalExt);
      const storagePath = `${ownerId}/${chargeId}/${attachmentId}.${ext}`;

      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("attachments")
        .upload(storagePath, processed, {
          contentType: processed.type,
          upsert: false,
        });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }

      startTransition(async () => {
        const result = await attachReceiptAction({
          charge_id: chargeId,
          attachment_id: attachmentId,
          storage_path: storagePath,
          mime_type: processed.type,
          size_bytes: processed.size,
          original_name: file.name,
        });
        if (result?.error) toast.error(result.error);
        else toast.success("Anexo enviado.");
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={onChange}
      />
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Enviando..." : "Anexar comprovante"}
      </Button>
    </>
  );
}
```

- [ ] **Step 2: AttachmentsGrid**

Create `components/AttachmentsGrid.tsx`:

```tsx
import Link from "next/link";
import type { Attachment } from "@/features/charges/types";
import { signedUrlForAttachment } from "@/features/charges/queries";
import { AttachmentDeleteButton } from "@/components/AttachmentDeleteButton";

async function resolveUrl(a: Attachment): Promise<string | null> {
  return signedUrlForAttachment(a.storage_path);
}

export async function AttachmentsGrid({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;

  const entries = await Promise.all(
    attachments.map(async (a) => ({ a, url: await resolveUrl(a) })),
  );

  return (
    <div className="grid grid-cols-3 gap-3">
      {entries.map(({ a, url }) => {
        const isImage = a.mime_type.startsWith("image/");
        return (
          <div key={a.id} className="relative overflow-hidden rounded-md border">
            {url ? (
              isImage ? (
                <Link href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={a.original_name ?? "Anexo"}
                    className="aspect-square w-full object-cover"
                  />
                </Link>
              ) : (
                <Link
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex aspect-square w-full items-center justify-center bg-muted text-xs"
                >
                  PDF
                </Link>
              )
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                indisponível
              </div>
            )}
            <AttachmentDeleteButton attachmentId={a.id} />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: AttachmentDeleteButton**

Create `components/AttachmentDeleteButton.tsx`:

```tsx
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAttachmentAction } from "@/features/charges/actions";

export function AttachmentDeleteButton({ attachmentId }: { attachmentId: string }) {
  const [pending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await deleteAttachmentAction(attachmentId);
      if (result?.error) toast.error(result.error);
      else toast.success("Anexo removido.");
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="absolute right-1 top-1 rounded bg-background/80 px-1.5 py-0.5 text-xs text-destructive hover:bg-background"
      aria-label="Remover anexo"
    >
      ✕
    </button>
  );
}
```

- [ ] **Step 4: Typecheck and commit**

```bash
pnpm typecheck
git add components/ReceiptUploadButton.tsx components/AttachmentsGrid.tsx components/AttachmentDeleteButton.tsx
git commit -m "feat(charges): receipt upload and attachments grid components"
```

---

### Task 10: Wire attachments into charge detail page

**Files:**

- Modify: `app/(app)/cobrancas/[id]/page.tsx`

- [ ] **Step 1: Fetch attachments and render the grid + upload button**

Open `app/(app)/cobrancas/[id]/page.tsx`.

Add imports:

```tsx
import { listAttachmentsForCharge } from "@/features/charges/queries";
import { AttachmentsGrid } from "@/components/AttachmentsGrid";
import { ReceiptUploadButton } from "@/components/ReceiptUploadButton";
```

After `const settings = await getSettings();` (added in Task 5) and before the return, load the attachments and the owner id:

```tsx
const attachments = await listAttachmentsForCharge(charge.id);
const ownerId = charge.owner_id;
```

In the JSX, add a new section just above the closing `</section>` tag:

```tsx
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <h2 className="text-sm font-semibold uppercase text-muted-foreground">Comprovantes</h2>
    <ReceiptUploadButton chargeId={charge.id} ownerId={ownerId} />
  </div>
  {attachments.length === 0 ? (
    <p className="text-sm text-muted-foreground">Nenhum anexo ainda.</p>
  ) : (
    <AttachmentsGrid attachments={attachments} />
  )}
</div>
```

- [ ] **Step 2: Typecheck, build, commit**

```bash
pnpm typecheck
pnpm build
```

Both exit 0.

```bash
git add "app/(app)/cobrancas"
git commit -m "feat(charges): attachments section on detail page"
```

---

## Phase 3 — Reports

### Task 11: `features/reports/services/aggregate.ts` (TDD)

**Files:**

- Create: `features/reports/services/aggregate.ts`, `tests/unit/features/reports/services/aggregate.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/features/reports/services/aggregate.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  sumEarnings,
  groupPaidByMonth,
  groupPaidByClient,
} from "@/features/reports/services/aggregate";
import type { Charge } from "@/features/charges/types";

function c(
  partial: Partial<Charge> & {
    id: string;
    status: Charge["status"];
    paid_at: string | null;
  },
): Charge {
  return {
    owner_id: "o",
    client_id: "cli-" + partial.id,
    due_date: "2026-01-01",
    amount_cents: 0,
    paid_amount_cents: null,
    payment_method: null,
    notes: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    ...partial,
  };
}

describe("sumEarnings", () => {
  it("sums paid_amount_cents when present, falls back to amount_cents", () => {
    const rows = [
      c({ id: "1", status: "paid", paid_at: "2026-04-10T12:00:00Z", amount_cents: 10000 }),
      c({
        id: "2",
        status: "paid",
        paid_at: "2026-04-20T12:00:00Z",
        amount_cents: 10000,
        paid_amount_cents: 9000,
      }),
    ];
    expect(sumEarnings(rows)).toBe(19000);
  });

  it("ignores non-paid charges", () => {
    const rows = [
      c({ id: "1", status: "paid", paid_at: "2026-04-10T12:00:00Z", amount_cents: 5000 }),
      c({ id: "2", status: "pending", paid_at: null, amount_cents: 5000 }),
      c({ id: "3", status: "canceled", paid_at: null, amount_cents: 5000 }),
    ];
    expect(sumEarnings(rows)).toBe(5000);
  });

  it("returns 0 for empty input", () => {
    expect(sumEarnings([])).toBe(0);
  });
});

describe("groupPaidByMonth", () => {
  it("groups paid charges by yyyy-mm derived from paid_at", () => {
    const rows = [
      c({ id: "1", status: "paid", paid_at: "2026-03-05T12:00:00Z", amount_cents: 10000 }),
      c({ id: "2", status: "paid", paid_at: "2026-04-15T12:00:00Z", amount_cents: 20000 }),
      c({ id: "3", status: "paid", paid_at: "2026-04-28T12:00:00Z", amount_cents: 15000 }),
      c({ id: "4", status: "pending", paid_at: null, amount_cents: 99 }),
    ];
    const out = groupPaidByMonth(rows);
    expect(out).toEqual([
      { month: "2026-04", total_cents: 35000, count: 2 },
      { month: "2026-03", total_cents: 10000, count: 1 },
    ]);
  });

  it("returns [] when no paid charges", () => {
    expect(groupPaidByMonth([])).toEqual([]);
  });
});

describe("groupPaidByClient", () => {
  it("sums paid charges per client and sorts by total desc", () => {
    const rows = [
      c({
        id: "1",
        status: "paid",
        paid_at: "2026-04-01T12:00:00Z",
        amount_cents: 10000,
        client_id: "a",
      }),
      c({
        id: "2",
        status: "paid",
        paid_at: "2026-04-15T12:00:00Z",
        amount_cents: 20000,
        client_id: "b",
      }),
      c({
        id: "3",
        status: "paid",
        paid_at: "2026-04-28T12:00:00Z",
        amount_cents: 5000,
        client_id: "a",
      }),
    ];
    const out = groupPaidByClient(rows);
    expect(out).toEqual([
      { client_id: "b", total_cents: 20000, count: 1 },
      { client_id: "a", total_cents: 15000, count: 2 },
    ]);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
pnpm test tests/unit/features/reports/services/aggregate.test.ts
```

Expected: "Cannot find module '@/features/reports/services/aggregate'".

- [ ] **Step 3: Implement**

Create `features/reports/services/aggregate.ts`:

```typescript
import type { Charge } from "@/features/charges/types";

function effectiveCents(c: Charge): number {
  return c.paid_amount_cents ?? c.amount_cents;
}

function paidMonthKey(c: Charge): string | null {
  if (!c.paid_at) return null;
  return c.paid_at.slice(0, 7); // "yyyy-mm" from ISO timestamp
}

export function sumEarnings(charges: readonly Charge[]): number {
  return charges
    .filter((c) => c.status === "paid")
    .reduce((total, c) => total + effectiveCents(c), 0);
}

export function groupPaidByMonth(
  charges: readonly Charge[],
): { month: string; total_cents: number; count: number }[] {
  const buckets = new Map<string, { total_cents: number; count: number }>();
  for (const c of charges) {
    if (c.status !== "paid") continue;
    const key = paidMonthKey(c);
    if (!key) continue;
    const existing = buckets.get(key) ?? { total_cents: 0, count: 0 };
    existing.total_cents += effectiveCents(c);
    existing.count += 1;
    buckets.set(key, existing);
  }
  return Array.from(buckets.entries())
    .map(([month, v]) => ({ month, total_cents: v.total_cents, count: v.count }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

export function groupPaidByClient(
  charges: readonly Charge[],
): { client_id: string; total_cents: number; count: number }[] {
  const buckets = new Map<string, { total_cents: number; count: number }>();
  for (const c of charges) {
    if (c.status !== "paid") continue;
    const existing = buckets.get(c.client_id) ?? { total_cents: 0, count: 0 };
    existing.total_cents += effectiveCents(c);
    existing.count += 1;
    buckets.set(c.client_id, existing);
  }
  return Array.from(buckets.entries())
    .map(([client_id, v]) => ({ client_id, total_cents: v.total_cents, count: v.count }))
    .sort((a, b) =>
      b.total_cents === a.total_cents
        ? a.client_id.localeCompare(b.client_id)
        : b.total_cents - a.total_cents,
    );
}
```

- [ ] **Step 4: Run, confirm pass, commit**

```bash
pnpm test tests/unit/features/reports/services/aggregate.test.ts
```

Expected: all 3 describe blocks pass (8 tests).

```bash
git add features/reports/services/aggregate.ts tests/unit/features/reports/services/aggregate.test.ts
git commit -m "feat(reports): aggregation service"
```

---

### Task 12: Reports queries

**Files:**

- Create: `features/reports/queries.ts`

- [ ] **Step 1: Create queries**

Create `features/reports/queries.ts`:

```typescript
import { createClient } from "@/lib/supabase/server";
import type { Charge } from "@/features/charges/types";

/**
 * Fetch all paid charges for the caller, across all time.
 * Used by the reports list and monthly breakdown pages.
 */
export async function listAllPaidCharges(): Promise<Charge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("charges")
    .select("*")
    .eq("status", "paid")
    .is("deleted_at", null)
    .order("paid_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Charge[];
}

/**
 * Fetch paid charges whose paid_at falls within [monthStart, nextMonthStart).
 * Dates are "YYYY-MM-DD" strings (inclusive start, exclusive end).
 */
export async function listPaidChargesInMonth(
  monthStartISO: string,
  nextMonthStartISO: string,
): Promise<Charge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("charges")
    .select("*")
    .eq("status", "paid")
    .gte("paid_at", `${monthStartISO}T00:00:00+00:00`)
    .lt("paid_at", `${nextMonthStartISO}T00:00:00+00:00`)
    .is("deleted_at", null)
    .order("paid_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Charge[];
}

/**
 * Fetch id → name map for the caller's non-deleted clients.
 * Used on the monthly breakdown page to render client names.
 */
export async function mapClientIdsToNames(): Promise<Map<string, string>> {
  const supabase = createClient();
  const { data, error } = await supabase.from("clients").select("id, name").is("deleted_at", null);
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const row of data ?? []) map.set(row.id, row.name);
  return map;
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add features/reports/queries.ts
git commit -m "feat(reports): paid-charges queries"
```

---

### Task 13: `/relatorios` page

**Files:**

- Create: `app/(app)/relatorios/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/(app)/relatorios/page.tsx`:

```tsx
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { formatBRL } from "@/lib/money";
import { monthBoundsUTC, isoToBRDate } from "@/lib/date";
import { listAllPaidCharges } from "@/features/reports/queries";
import { groupPaidByMonth, sumEarnings } from "@/features/reports/services/aggregate";

export const dynamic = "force-dynamic";

const monthLabel = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function labelFor(yyyyMm: string): string {
  const [yearStr, monthStr] = yyyyMm.split("-");
  const monthIdx = Number.parseInt(monthStr ?? "1", 10) - 1;
  return `${monthLabel[monthIdx] ?? monthStr} / ${yearStr}`;
}

export default async function RelatoriosPage() {
  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth() + 1;
  const bounds = monthBoundsUTC(currentYear, currentMonth);

  const allPaid = await listAllPaidCharges();
  const months = groupPaidByMonth(allPaid);

  const currentMonthPaid = allPaid.filter(
    (c) =>
      c.paid_at &&
      c.paid_at >= `${bounds.start}T00:00:00+00:00` &&
      c.paid_at < `${bounds.endExclusive}T00:00:00+00:00`,
  );
  const currentMonthTotal = sumEarnings(currentMonthPaid);

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Recebido em {labelFor(`${currentYear}-${String(currentMonth).padStart(2, "0")}`)}
        </p>
      </header>

      <div className="rounded-md border p-4">
        <div className="text-sm text-muted-foreground">Total do mês</div>
        <div className="text-2xl font-semibold">{formatBRL(currentMonthTotal)}</div>
        <div className="text-xs text-muted-foreground">
          {currentMonthPaid.length}{" "}
          {currentMonthPaid.length === 1 ? "cobrança paga" : "cobranças pagas"}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Histórico</h2>
        {months.length === 0 ? (
          <EmptyState
            title="Sem histórico ainda"
            description="Quando você marcar cobranças como pagas, elas aparecem aqui."
          />
        ) : (
          <div className="space-y-2">
            {months.map((m) => (
              <Link
                key={m.month}
                href={`/relatorios/${m.month.replace("-", "")}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-muted"
              >
                <div>
                  <div className="font-medium">{labelFor(m.month)}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.count} {m.count === 1 ? "cobrança" : "cobranças"}
                  </div>
                </div>
                <div className="font-semibold">{formatBRL(m.total_cents)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck, build, commit**

```bash
pnpm typecheck
pnpm build
```

Both exit 0.

```bash
git add "app/(app)/relatorios/page.tsx"
git commit -m "feat(reports): relatorios page with current-month banner"
```

---

### Task 14: `/relatorios/[yyyymm]` per-client breakdown

**Files:**

- Create: `app/(app)/relatorios/[yyyymm]/page.tsx`

- [ ] **Step 1: Create the page**

Create `app/(app)/relatorios/[yyyymm]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatBRL } from "@/lib/money";
import { monthBoundsUTC } from "@/lib/date";
import { listPaidChargesInMonth, mapClientIdsToNames } from "@/features/reports/queries";
import { groupPaidByClient, sumEarnings } from "@/features/reports/services/aggregate";

export const dynamic = "force-dynamic";

const monthLabel = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function parseYyyymm(raw: string): { year: number; month: number } | null {
  if (!/^\d{6}$/.test(raw)) return null;
  const year = Number.parseInt(raw.slice(0, 4), 10);
  const month = Number.parseInt(raw.slice(4, 6), 10);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export default async function RelatorioMesPage({ params }: { params: { yyyymm: string } }) {
  const parsed = parseYyyymm(params.yyyymm);
  if (!parsed) notFound();

  const bounds = monthBoundsUTC(parsed.year, parsed.month);
  const [paid, clientNames] = await Promise.all([
    listPaidChargesInMonth(bounds.start, bounds.endExclusive),
    mapClientIdsToNames(),
  ]);

  const total = sumEarnings(paid);
  const byClient = groupPaidByClient(paid);

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <Link href="/relatorios" className="text-sm text-muted-foreground hover:underline">
          ← Relatórios
        </Link>
        <h1 className="text-2xl font-semibold">
          {monthLabel[parsed.month - 1]} / {parsed.year}
        </h1>
      </header>

      <div className="rounded-md border p-4">
        <div className="text-sm text-muted-foreground">Total recebido</div>
        <div className="text-2xl font-semibold">{formatBRL(total)}</div>
        <div className="text-xs text-muted-foreground">
          {paid.length} {paid.length === 1 ? "cobrança paga" : "cobranças pagas"}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground">Por cliente</h2>
        {byClient.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pagamento neste mês.</p>
        ) : (
          <div className="space-y-2">
            {byClient.map((b) => (
              <Link
                key={b.client_id}
                href={`/clientes/${b.client_id}`}
                className="flex items-center justify-between rounded-md border p-3 hover:bg-muted"
              >
                <div>
                  <div className="font-medium">
                    {clientNames.get(b.client_id) ?? "Cliente arquivado"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.count} {b.count === 1 ? "cobrança" : "cobranças"}
                  </div>
                </div>
                <div className="font-semibold">{formatBRL(b.total_cents)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck, build, commit**

```bash
pnpm typecheck
pnpm build
```

Both exit 0.

```bash
git add "app/(app)/relatorios"
git commit -m "feat(reports): monthly per-client breakdown page"
```

---

## Phase 4 — Ajustes (Settings UI)

### Task 15: `/ajustes` hub page

**Files:**

- Create: `app/(app)/ajustes/page.tsx`

- [ ] **Step 1: Create the hub**

Create `app/(app)/ajustes/page.tsx`:

```tsx
import Link from "next/link";

export const dynamic = "force-dynamic";

const rows: { href: string; title: string; description: string }[] = [
  {
    href: "/ajustes/template",
    title: "Mensagem do WhatsApp",
    description: "Edite o texto enviado aos clientes.",
  },
  {
    href: "/ajustes/notificacoes",
    title: "Lembrete diário por e-mail",
    description: "Horário e preferências de envio.",
  },
  {
    href: "/ajustes/conta",
    title: "Conta",
    description: "Sair, apagar meus dados.",
  },
];

export default function AjustesPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      <div className="space-y-2">
        {rows.map((r) => (
          <Link key={r.href} href={r.href} className="block rounded-md border p-4 hover:bg-muted">
            <div className="font-medium">{r.title}</div>
            <div className="text-xs text-muted-foreground">{r.description}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-md border p-4 text-sm">
        <div className="font-medium">Plano</div>
        <div className="text-muted-foreground">Gratuito</div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
pnpm typecheck
git add "app/(app)/ajustes/page.tsx"
git commit -m "feat(ajustes): hub page"
```

---

### Task 16: `/ajustes/template` editor

**Files:**

- Create: `app/(app)/ajustes/template/page.tsx`, `components/TemplateEditor.tsx`

- [ ] **Step 1: TemplateEditor client component**

Create `components/TemplateEditor.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fillTemplate } from "@/features/charges/services/template";
import { updateTemplateAction } from "@/features/settings/actions";

export function TemplateEditor({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  const preview = fillTemplate(value, {
    nome: "João",
    valor: "R$ 150,00",
    vencimento: "19/04/2026",
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateTemplateAction({ message_template: value });
      if (result?.error) toast.error(result.error);
      else toast.success("Template salvo.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="template">Mensagem</Label>
        <Textarea
          id="template"
          rows={6}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Use {"{nome}"}, {"{valor}"} e {"{vencimento}"} como marcadores.
        </p>
      </div>

      <div className="rounded-md border bg-muted/40 p-3 text-sm">
        <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Prévia</div>
        <p className="whitespace-pre-wrap">{preview}</p>
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Page**

Create `app/(app)/ajustes/template/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { TemplateEditor } from "@/components/TemplateEditor";
import { getSettings } from "@/features/settings/queries";

export const dynamic = "force-dynamic";

export default async function TemplatePage() {
  const settings = await getSettings();
  if (!settings) redirect("/ajustes");

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-1">
        <Link href="/ajustes" className="text-sm text-muted-foreground hover:underline">
          ← Ajustes
        </Link>
        <h1 className="text-2xl font-semibold">Mensagem do WhatsApp</h1>
      </div>

      <TemplateEditor initial={settings.message_template} />
    </section>
  );
}
```

- [ ] **Step 3: Typecheck, build, commit**

```bash
pnpm typecheck
pnpm build
git add components/TemplateEditor.tsx "app/(app)/ajustes/template"
git commit -m "feat(ajustes): template editor"
```

---

### Task 17: `/ajustes/notificacoes` reminder settings

**Files:**

- Create: `app/(app)/ajustes/notificacoes/page.tsx`, `components/ReminderSettingsForm.tsx`

- [ ] **Step 1: Form component**

Create `components/ReminderSettingsForm.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateReminderAction } from "@/features/settings/actions";

type Props = {
  initialEnabled: boolean;
  initialTime: string; // "HH:MM" or "HH:MM:SS"
  initialNotifyOnlyIfAny: boolean;
};

function normalizeTime(raw: string): string {
  // Trim seconds for the <input type="time"> value; send "HH:MM:SS" back.
  const m = /^(\d{2}:\d{2})(:\d{2})?$/.exec(raw);
  return m ? (m[1] ?? raw) : raw;
}

export function ReminderSettingsForm({
  initialEnabled,
  initialTime,
  initialNotifyOnlyIfAny,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [time, setTime] = useState(normalizeTime(initialTime));
  const [notifyOnlyIfAny, setNotifyOnlyIfAny] = useState(initialNotifyOnlyIfAny);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateReminderAction({
        email_reminders_enabled: enabled,
        daily_reminder_time: `${time}:00`,
        notify_only_if_any: notifyOnlyIfAny,
      });
      if (result?.error) toast.error(result.error);
      else toast.success("Preferências salvas.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="flex items-center justify-between gap-3 rounded-md border p-3">
        <span className="text-sm">Receber lembrete diário por e-mail</span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4"
        />
      </label>

      <div className="space-y-2">
        <Label htmlFor="time">Horário (América/São Paulo)</Label>
        <Input
          id="time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
      </div>

      <label className="flex items-center justify-between gap-3 rounded-md border p-3">
        <span className="text-sm">Só enviar quando houver cobrança vencendo ou em atraso</span>
        <input
          type="checkbox"
          checked={notifyOnlyIfAny}
          onChange={(e) => setNotifyOnlyIfAny(e.target.checked)}
          className="h-4 w-4"
        />
      </label>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Page**

Create `app/(app)/ajustes/notificacoes/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReminderSettingsForm } from "@/components/ReminderSettingsForm";
import { getSettings } from "@/features/settings/queries";

export const dynamic = "force-dynamic";

export default async function NotificacoesPage() {
  const settings = await getSettings();
  if (!settings) redirect("/ajustes");

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-1">
        <Link href="/ajustes" className="text-sm text-muted-foreground hover:underline">
          ← Ajustes
        </Link>
        <h1 className="text-2xl font-semibold">Lembrete diário por e-mail</h1>
        <p className="text-sm text-muted-foreground">
          O envio automático é ativado no próximo release (Plano 4).
        </p>
      </div>

      <ReminderSettingsForm
        initialEnabled={settings.email_reminders_enabled}
        initialTime={settings.daily_reminder_time}
        initialNotifyOnlyIfAny={settings.notify_only_if_any}
      />
    </section>
  );
}
```

- [ ] **Step 3: Typecheck, build, commit**

```bash
pnpm typecheck
pnpm build
git add components/ReminderSettingsForm.tsx "app/(app)/ajustes/notificacoes"
git commit -m "feat(ajustes): reminder settings page"
```

---

### Task 18: `/ajustes/conta` account page with erase-data

**Files:**

- Create: `app/(app)/ajustes/conta/page.tsx`, `components/EraseDataDialog.tsx`

- [ ] **Step 1: EraseDataDialog**

Create `components/EraseDataDialog.tsx`:

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
import { toast } from "sonner";
import { eraseMyDataAction } from "@/features/settings/actions";

const CONFIRM_PHRASE = "APAGAR";

export function EraseDataDialog() {
  const [open, setOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const [pending, startTransition] = useTransition();

  function onConfirm() {
    if (phrase !== CONFIRM_PHRASE) {
      toast.error(`Digite ${CONFIRM_PHRASE} para confirmar.`);
      return;
    }
    startTransition(async () => {
      const result = await eraseMyDataAction();
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          Apagar meus dados
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apagar todos os dados?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>
            Isto vai remover permanentemente todos os seus clientes, cobranças, anexos e
            comprovantes enviados. Sua conta de acesso continua ativa, mas sem dados.
          </p>
          <p className="text-muted-foreground">
            Digite <strong>{CONFIRM_PHRASE}</strong> abaixo para confirmar.
          </p>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmação</Label>
            <Input
              id="confirm"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder={CONFIRM_PHRASE}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={pending || phrase !== CONFIRM_PHRASE}
            onClick={onConfirm}
          >
            {pending ? "Apagando..." : "Apagar tudo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Page**

Create `app/(app)/ajustes/conta/page.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EraseDataDialog } from "@/components/EraseDataDialog";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(app)/actions/sign-out";

export const dynamic = "force-dynamic";

export default async function ContaPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-1">
        <Link href="/ajustes" className="text-sm text-muted-foreground hover:underline">
          ← Ajustes
        </Link>
        <h1 className="text-2xl font-semibold">Conta</h1>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-md border p-4 text-sm">
        <dt className="text-muted-foreground">E-mail</dt>
        <dd>{user.email ?? "—"}</dd>
      </dl>

      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full">
          Sair
        </Button>
      </form>

      <div className="pt-2">
        <EraseDataDialog />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck, build, commit**

```bash
pnpm typecheck
pnpm build
git add components/EraseDataDialog.tsx "app/(app)/ajustes/conta"
git commit -m "feat(ajustes): account page with erase-data"
```

---

## Phase 5 — Nav redesign

### Task 19: Responsive `Nav` component

**Files:**

- Create: `components/Nav.tsx`

- [ ] **Step 1: Install icons we'll use**

lucide-react is already installed (per memory). Confirm the following icon names exist by inspection: `CalendarDays`, `Users`, `PieChart`, `Settings2`. If any name changed, adjust by matching the closest equivalent in `node_modules/lucide-react/dist/esm/icons/`.

- [ ] **Step 2: Create the Nav**

Create `components/Nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, PieChart, Settings2 } from "lucide-react";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const ITEMS: Item[] = [
  { href: "/hoje", label: "Hoje", Icon: CalendarDays },
  { href: "/clientes", label: "Clientes", Icon: Users },
  { href: "/relatorios", label: "Relatórios", Icon: PieChart },
  { href: "/ajustes", label: "Ajustes", Icon: Settings2 },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/hoje") return pathname === "/hoje";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t bg-background lg:hidden">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 px-2 py-2 text-xs ${
              active ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            <item.Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 border-r bg-background p-3 lg:flex">
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <item.Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
pnpm typecheck
git add components/Nav.tsx
git commit -m "feat(nav): responsive bottom-tab and side-nav components"
```

---

### Task 20: Rewrite `(app)/layout.tsx` + slim down TopBar

**Files:**

- Modify: `app/(app)/layout.tsx`, `components/TopBar.tsx`

- [ ] **Step 1: Slim down TopBar**

Replace `components/TopBar.tsx` with:

```tsx
import { signOut } from "@/app/(app)/actions/sign-out";
import { Button } from "@/components/ui/button";

export function TopBar({ email }: { email: string }) {
  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <span className="font-semibold">EtherPay</span>
      <div className="hidden items-center gap-3 lg:flex">
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

- [ ] **Step 2: Rewrite `(app)/layout.tsx`**

Replace `app/(app)/layout.tsx` with:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { BottomNav, SideNav } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar email={user.email ?? ""} />
      <div className="flex flex-1">
        <SideNav />
        <main className="flex-1 px-4 py-6 pb-24 lg:pb-6">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 3: Typecheck, build, commit**

```bash
pnpm typecheck
pnpm build
git add components/TopBar.tsx "app/(app)/layout.tsx"
git commit -m "feat(nav): responsive (app) layout with bottom tabs and side nav"
```

---

## Phase 6 — Client detail enhancements

### Task 21: Charge history on client detail + "Nova cobrança avulsa"

**Files:**

- Modify: `features/charges/actions.ts`, `features/charges/queries.ts`, `app/(app)/clientes/[id]/page.tsx`
- Create: `components/OneOffChargeDialog.tsx`, `features/charges/schema-oneoff.ts`

- [ ] **Step 1: One-off charge schema**

Create `features/charges/schema-oneoff.ts`:

```typescript
import { z } from "zod";

export const oneOffChargeInputSchema = z.object({
  client_id: z.string().uuid(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount_cents: z.number().int().nonnegative(),
  notes: z
    .string()
    .max(2000)
    .nullable()
    .or(z.literal("").transform(() => null)),
});

export type OneOffChargeInput = z.infer<typeof oneOffChargeInputSchema>;
```

- [ ] **Step 2: `createOneOffChargeAction`**

Open `features/charges/actions.ts`. Add to the imports:

```typescript
import { oneOffChargeInputSchema } from "./schema-oneoff";
```

At the end of the file, append:

```typescript
export async function createOneOffChargeAction(input: unknown) {
  const parsed = oneOffChargeInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const id = newId();
  const { error } = await supabase.from("charges").insert({
    id,
    owner_id: user.id,
    client_id: parsed.data.client_id,
    due_date: parsed.data.due_date,
    amount_cents: parsed.data.amount_cents,
    status: "pending",
    notes: parsed.data.notes,
  });
  if (error) return { error: error.message };

  revalidatePath("/hoje");
  revalidatePath(`/clientes/${parsed.data.client_id}`);
  return { success: true, chargeId: id };
}
```

- [ ] **Step 3: Add `listChargesForClientWithStatus` query**

Open `features/charges/queries.ts`. The existing `listChargesForClient` is adequate — reuse it from the client detail page. No change needed.

- [ ] **Step 4: OneOffChargeDialog**

Create `components/OneOffChargeDialog.tsx`:

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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { brlToCents, formatBRL } from "@/lib/money";
import { formatISODate } from "@/lib/date";
import { createOneOffChargeAction } from "@/features/charges/actions";

type Props = {
  clientId: string;
  defaultAmountCents: number;
};

export function OneOffChargeDialog({ clientId, defaultAmountCents }: Props) {
  const [open, setOpen] = useState(false);
  const [dueDate, setDueDate] = useState(formatISODate(new Date()));
  const [amountDisplay, setAmountDisplay] = useState(formatBRL(defaultAmountCents));
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cents = brlToCents(amountDisplay);
    if (cents === null) {
      toast.error("Valor inválido.");
      return;
    }
    startTransition(async () => {
      const result = await createOneOffChargeAction({
        client_id: clientId,
        due_date: dueDate,
        amount_cents: cents,
        notes: notes === "" ? null : notes,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Cobrança avulsa criada.");
        setOpen(false);
        setNotes("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Nova cobrança avulsa</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova cobrança avulsa</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="due_date">Vencimento</Label>
            <Input
              id="due_date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              value={amountDisplay}
              onChange={(e) => setAmountDisplay(e.target.value)}
              placeholder="R$ 150,00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: Expand client detail page**

Open `app/(app)/clientes/[id]/page.tsx`.

Add imports:

```tsx
import { listChargesForClient } from "@/features/charges/queries";
import { OneOffChargeDialog } from "@/components/OneOffChargeDialog";
```

After the `const client = await getClient(params.id); if (!client) notFound();` lines, add:

```tsx
const charges = await listChargesForClient(client.id);
```

Insert a "Cobranças" section above the archive button:

```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <h2 className="text-sm font-semibold uppercase text-muted-foreground">Cobranças</h2>
    <OneOffChargeDialog clientId={client.id} defaultAmountCents={client.default_amount_cents} />
  </div>
  {charges.length === 0 ? (
    <p className="text-sm text-muted-foreground">Nenhuma cobrança ainda.</p>
  ) : (
    <div className="space-y-2">
      {charges.map((c) => (
        <Link
          key={c.id}
          href={`/cobrancas/${c.id}`}
          className="flex items-center justify-between rounded-md border p-3 hover:bg-muted"
        >
          <div>
            <div className="font-medium">{isoToBRDate(c.due_date)}</div>
            <div className="text-xs text-muted-foreground">
              {c.status === "paid" ? "Paga" : c.status === "canceled" ? "Cancelada" : "Pendente"}
            </div>
          </div>
          <div className="font-semibold">{formatBRL(c.amount_cents)}</div>
        </Link>
      ))}
    </div>
  )}
</div>
```

Ensure `Link` is imported (already is in Plan 1). The existing `formatBRL` and `isoToBRDate` imports should stay.

- [ ] **Step 6: Typecheck, build, commit**

```bash
pnpm typecheck
pnpm build
git add features/charges/schema-oneoff.ts features/charges/actions.ts components/OneOffChargeDialog.tsx "app/(app)/clientes"
git commit -m "feat(clients): charge history and nova cobrança avulsa"
```

---

## Phase 7 — E2E verification

### Task 22: E2E for WhatsApp + Reports + Ajustes

**Files:**

- Create: `tests/e2e/ajustes-and-reports.spec.ts`
- Modify: `tests/e2e/charges.spec.ts` (update selector after nav redesign)

- [ ] **Step 1: Adapt charges.spec.ts for the nav redesign**

The existing test clicks `getByRole("link", { name: "Hoje" })` to navigate from the client detail back to Hoje. With the new Nav component both the side nav and bottom nav expose that link; Playwright will hit either depending on viewport. The default Playwright viewport is desktop (1280×720), so the side nav wins.

Open `tests/e2e/charges.spec.ts`. Replace the line:

```typescript
await page.getByRole("link", { name: "Hoje" }).click();
```

with:

```typescript
await page.getByRole("link", { name: "Hoje", exact: true }).first().click();
```

- [ ] **Step 2: Similarly update clients.spec.ts**

Open `tests/e2e/clients.spec.ts`. Replace the line:

```typescript
await page.getByRole("link", { name: "Clientes", exact: true }).click();
```

with:

```typescript
await page.getByRole("link", { name: "Clientes", exact: true }).first().click();
```

- [ ] **Step 3: Write the new E2E**

Create `tests/e2e/ajustes-and-reports.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

test("edit template, create charge, mark paid, see monthly total", async ({ page }) => {
  const email = `p3${Date.now()}@example.test`;
  const password = "testpass1234";

  // Sign up + sign in
  await page.goto("/sign-up");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /Criar/ }).click();
  await page.goto("/sign-in");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: /Entrar/ }).click();
  await expect(page).toHaveURL(/\/hoje$/);

  // Edit template via Ajustes
  await page.getByRole("link", { name: "Ajustes", exact: true }).first().click();
  await expect(page).toHaveURL(/\/ajustes$/);
  await page.getByRole("link", { name: /Mensagem do WhatsApp/ }).click();
  await expect(page).toHaveURL(/\/ajustes\/template$/);
  await page.getByLabel("Mensagem").fill("Olá {nome}, teste {valor} {vencimento}.");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Template salvo.")).toBeVisible();

  // Create a client due today
  const today = new Date().toISOString().slice(0, 10);
  await page.goto("/clientes/novo");
  await page.getByLabel("Nome").fill("Carlos Teste");
  await page.getByLabel("Telefone (WhatsApp)").fill("+5511998887777");
  await page.getByLabel("Valor padrão").fill("R$ 300,00");
  await page.getByLabel("Primeiro vencimento").fill(today);
  await page.getByRole("button", { name: "Criar" }).click();
  await expect(page.getByRole("heading", { name: "Carlos Teste" })).toBeVisible();

  // Mark the today charge as paid from Hoje
  await page.getByRole("link", { name: "Hoje", exact: true }).first().click();
  await page.getByRole("button", { name: "Ações" }).first().click();
  await page.getByRole("menuitem", { name: "Marcar pago" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Carlos Teste")).toHaveCount(0);

  // Relatórios shows the payment
  await page.getByRole("link", { name: "Relatórios", exact: true }).first().click();
  await expect(page).toHaveURL(/\/relatorios$/);
  await expect(page.getByText("R$ 300,00")).toBeVisible();
});
```

- [ ] **Step 4: Run the full E2E suite**

Ensure local Supabase is running (`pnpm exec supabase status`; if not, `pnpm exec supabase start`).

```bash
pnpm test:e2e
```

Expected: 4 specs pass — `smoke`, `clients`, `charges`, `ajustes-and-reports`.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e
git commit -m "test(e2e): ajustes template edit and relatorios total"
```

---

## Phase 8 — Final

### Task 23: Final check suite + push

**Files:** (no changes)

- [ ] **Step 1: Full check suite**

```bash
pnpm lint
pnpm typecheck
pnpm test
```

All three exit 0. Unit test count: Plan 1 (15) + Plan 2 (22) + Plan 3 template (5) + Plan 3 aggregate (8) = 50 tests.

- [ ] **Step 2: Format**

```bash
pnpm format
```

If prettier made changes, commit them as a style commit:

```bash
git diff --quiet || { git add -u && git commit -m "style: prettier format plan 3"; }
```

- [ ] **Step 3: Push**

```bash
git push
```

Expected: GitHub Actions CI passes all jobs.

---

## Closing checkpoint

At the end of Plan 3, the user can:

- Tap a charge on Hoje → dropdown → "Notificar pelo Whatsapp" → message is copied and WhatsApp opens at the client's chat.
- Attach a receipt image (auto-compressed client-side) or PDF to a paid or pending charge; thumbnails appear in a grid; tap to open; delete via the ✕ affordance.
- Open `/relatorios` to see the current month's total and a reverse-chronological list of past months; tap a month → per-client breakdown.
- Open `/ajustes` to edit the WhatsApp template (with a live filled preview), toggle the daily reminder and pick its time (firing comes in Plan 4), and apagar meus dados with a double-confirmation.
- Navigate via the bottom tab bar on mobile / left sidebar on desktop with four active routes.
- Open a client detail → see full charge history → tap "Nova cobrança avulsa" to add a one-off charge.

### Spec coverage

- **§4 feature set:** WhatsApp template + Notificar row action; per-charge attachments (image + PDF); reports (current month + historical list + per-client breakdown); settings (template editor + reminder time/toggle + erase data).
- **§6.4 settings:** read via `getSettings`; updated by `updateTemplateAction` and `updateReminderAction`.
- **§7.1 four pages:** Hoje, Clientes, Relatórios, Ajustes — all reachable via the responsive Nav.
- **§7.2 cobrança detail:** attachments grid + upload button + Notificar pelo Whatsapp button.
- **§7.3 key interactions:** Notificar (fill + copy + `wa.me`); Anexar comprovante (native file input with `capture="environment"`, client-side compression).
- **§8.3 domain services:** `template.ts` and `aggregate.ts` are pure (no Supabase imports) and TDD-covered.
- **§8.8 attachments:** path convention `<owner_id>/<charge_id>/<uuid>.<ext>`; bucket `attachments` with owner-scoped RLS (Plan 1 migration 0004).

### Known v1 risks intentionally deferred (not regressions)

- Daily reminder email sending — Plan 4.
- `next-intl` keyed strings — Plan 4.
- Feature-gate UI (only a static "Gratuito" card exists) — v2.
- Client list search + pagination — v2.
- Date-range filters / CSV export on Relatórios — v2 (spec §14.8).
- Nested attachment folders on storage delete (`.list(user.id)` does NOT recurse into `<user.id>/<charge_id>/`) — acknowledged limitation in `eraseMyDataAction` for v1; multi-level cleanup comes in Plan 4 or v2.

### Next: Plan 4 — Daily reminder email, PWA, i18n, deploy, setup guide

Plan 4 will implement:

- Supabase Edge Function `daily-reminder` scheduled via `pg_cron` hourly; sends email via Resend when a user's `daily_reminder_time` matches and there are charges to notify about.
- PWA manifest + service worker (add-to-home-screen, offline shell).
- `next-intl` wiring (all strings already written in PT-BR; this task routes them through `next-intl` keys so the locale switcher in Ajustes can be unhidden in v2).
- Cloudflare Pages deployment (`@cloudflare/next-on-pages` adapter, environment variables, auto-deploy on push).
- `docs/setup-guide.md` in PT-BR.
- Feature-gate stub activation (still returns `true`, but hooks are wired up).

Start Plan 4 only after Plan 3 is merged and the three new Playwright specs are green in CI.
