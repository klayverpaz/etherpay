# Design System — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar o Design System v1 descrito em `docs/superpowers/specs/2026-04-20-design-system.md` ao EtherPay — substituir tema shadcn default + Arial por paleta verde esmeralda + Inter, introduzir componentes (Hero, StatusBadge, FilterPills, Avatar), e refatorar as 4 telas principais (`/hoje`, `/clientes`, `/cobrancas/[id]`, `/relatorios`) para o novo visual.

**Architecture:** Mudança incremental no stack existente (Next 14 + Tailwind v3 + shadcn). Tokens no `globals.css` e `tailwind.config.ts`; primitivos novos em `components/ui/`; componentes de domínio em `components/`; nova query agregadora em `features/charges/queries.ts`. Zero mudança em rotas, schemas ou server actions.

**Tech Stack:** Next.js 14 App Router · Tailwind v3 · shadcn/ui (Radix) · Inter via `next/font/google` · lucide-react · Vitest (unit) · Playwright (e2e).

---

## Contexto obrigatório

Antes de começar qualquer task, ler:

- `docs/superpowers/specs/2026-04-20-design-system.md` — decisões de design, tokens, componentes, layouts
- `memory/etherpay_stack_state.md` (via /memory ou `.claude/projects/-Users-klayver-Repositories-etherpay/memory/`) — pins de versão e convenções pós-Plan 4

## Convenções do plano

- Todos os paths são relativos à raiz do repo (`/Users/klayver/Repositories/etherpay/`).
- Após cada task, rodar `pnpm lint && pnpm typecheck && pnpm test` — TODOS devem passar antes de commitar.
- Mensagens de commit em PT-BR, prefixadas com `feat:`, `refactor:`, `style:`, `test:`.
- **Não** criar dark mode, **não** adicionar day-strip, **não** mexer em server actions ou schema do banco.
- Se um teste Playwright quebrar por seletor (texto mudou), atualizar o teste junto no mesmo commit.

## File structure

Arquivos a serem criados ou modificados, agrupados por responsabilidade:

**Foundation (tokens + font)**
- Modificar: `app/globals.css` — CSS vars HSL da paleta verde esmeralda
- Modificar: `app/layout.tsx` — integrar `Inter` via `next/font/google`
- Modificar: `tailwind.config.ts` — estender colors com `warning`, `danger-soft`, `danger-text`

**Utilidades puras**
- Criar: `lib/initials.ts` — extrair iniciais de nome completo (2 letras max)
- Criar: `tests/unit/lib/initials.test.ts` — testes unitários
- Criar: `features/charges/services/summary.ts` — pura: agrega charges em `MonthSummary`
- Criar: `tests/unit/charges/summary.test.ts` — testes unitários

**Queries**
- Modificar: `features/charges/queries.ts` — adicionar `listMonthSummaryCharges(yyyyMm)` e `listUpcomingCharges(daysAhead, limit)`

**Primitivos UI (novos)**
- Criar: `components/ui/status-badge.tsx`
- Criar: `components/ui/filter-pills.tsx`
- Criar: `components/ui/avatar-initials.tsx`
- Criar: `components/ui/hero-summary.tsx`

**Componentes de domínio (refatorados)**
- Modificar: `components/Nav.tsx` — SideNav com brand + rodapé; BottomNav flutuante
- Modificar: `components/ChargeRow.tsx` — avatar + badge + borda esquerda + valor tabular
- Modificar: `components/ClientRow.tsx` — avatar + status inline
- Criar: `components/UpcomingChargesPanel.tsx` — painel lateral do desktop `/hoje`

**Páginas (refatoradas)**
- Modificar: `app/(app)/hoje/page.tsx`
- Modificar: `app/(app)/clientes/page.tsx`
- Modificar: `app/(app)/cobrancas/[id]/page.tsx`
- Modificar: `app/(app)/relatorios/page.tsx`
- Modificar: `app/(app)/layout.tsx` — remover TopBar se conflitar com nova SideNav (decisão dentro da task 9)

---

## Task 1: Fonte Inter + remoção do Arial

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Integrar Inter via `next/font/google`**

Substituir `app/layout.tsx` inteiro por:

```tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EtherPay",
  description: "Gerencie cobranças recorrentes de forma simples.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "EtherPay",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

Mudanças:
- Adicionado import do `Inter` e instância via `next/font/google`.
- `themeColor` alterado de `#0f172a` (slate escuro) para `#f8fafc` (bg do novo design).
- Adicionada classe `font-sans` no `body` (vai herdar `--font-inter` via tailwind).

- [ ] **Step 2: Rodar dev server e abrir a página de login**

Run: `pnpm dev`
Expected: Server em `http://localhost:3000`, página de `/sign-in` carrega com fonte Inter (visualmente diferente de Arial — "I" mais fino, "g" com loop, etc). Se ainda vier Arial, conferir se `font-sans` foi aplicada no `body`.

- [ ] **Step 3: Rodar verificações e commitar**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: todos passam.

```bash
git add app/layout.tsx
git commit -m "feat(design): integrar Inter via next/font/google"
```

---

## Task 2: Tokens — `globals.css` com paleta verde esmeralda

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Substituir CSS vars pela paleta do design system**

Substituir o bloco `@layer base { :root { ... } }` de `app/globals.css` por:

```css
@layer base {
  :root {
    /* Superfícies */
    --background: 210 40% 98%;         /* #f8fafc - slate-50 */
    --foreground: 0 0% 4%;             /* #0a0a0a - neutral-950 */
    --card: 0 0% 100%;                 /* #ffffff */
    --card-foreground: 0 0% 4%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 4%;

    /* Brand — primary mapeia ao accent do design */
    --primary: 160 84% 39%;            /* #10b981 - emerald-500 */
    --primary-foreground: 0 0% 100%;

    /* Secondary / muted */
    --secondary: 220 14% 96%;          /* #f3f4f6 - gray-100 */
    --secondary-foreground: 222 47% 11%;
    --muted: 220 14% 96%;
    --muted-foreground: 220 9% 46%;    /* #6b7280 - gray-500 */

    /* Accent soft — mapeia ao accent-soft do design */
    --accent: 152 76% 89%;             /* #d1fae5 - emerald-100 */
    --accent-foreground: 164 86% 16%;  /* #065f46 - emerald-800 */

    /* Semânticos */
    --destructive: 0 72% 51%;          /* #dc2626 - red-600 */
    --destructive-foreground: 0 0% 100%;
    --danger-soft: 0 93% 94%;          /* #fee2e2 - red-100 */
    --danger-text: 0 70% 35%;          /* #991b1b - red-800 */
    --warning: 33 93% 44%;             /* #d97706 - amber-600 */
    --warning-soft: 48 96% 89%;        /* #fef3c7 - amber-100 */
    --warning-text: 32 81% 29%;        /* #92400e - amber-800 */

    /* Borders / ring */
    --border: 220 13% 91%;             /* #e5e7eb - gray-200 */
    --input: 220 13% 91%;
    --ring: 160 84% 39%;               /* emerald-500 */

    --radius: 0.75rem;                 /* 12px — card default */

    --chart-1: 160 84% 39%;            /* emerald-500 */
    --chart-2: 152 76% 64%;            /* emerald-300 */
    --chart-3: 220 9% 46%;             /* gray-500 */
    --chart-4: 33 93% 44%;             /* amber-600 */
    --chart-5: 0 72% 51%;              /* red-600 */
  }

  .dark {
    /* Dark mode NÃO está no escopo v1. Mantendo valores dummy pra compilar. */
    --background: 0 0% 4%;
    --foreground: 0 0% 98%;
    --card: 0 0% 4%;
    --card-foreground: 0 0% 98%;
    --popover: 0 0% 4%;
    --popover-foreground: 0 0% 98%;
    --primary: 160 84% 39%;
    --primary-foreground: 0 0% 100%;
    --secondary: 220 14% 18%;
    --secondary-foreground: 0 0% 98%;
    --muted: 220 14% 18%;
    --muted-foreground: 220 9% 70%;
    --accent: 164 86% 16%;
    --accent-foreground: 152 76% 89%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --danger-soft: 0 70% 25%;
    --danger-text: 0 93% 94%;
    --warning: 33 93% 44%;
    --warning-soft: 32 81% 25%;
    --warning-text: 48 96% 89%;
    --border: 220 14% 18%;
    --input: 220 14% 18%;
    --ring: 160 84% 39%;
  }
}
```

Remover também a regra `body { font-family: Arial, Helvetica, sans-serif; }` do topo do arquivo (a fonte agora vem do `layout.tsx`).

- [ ] **Step 2: Verificar que a cor de fundo mudou visualmente**

Run: `pnpm dev`, abrir `http://localhost:3000/sign-in`
Expected: fundo passa de branco puro (#fff) pra levemente azulado (#f8fafc). Botão primário fica verde (não slate).

- [ ] **Step 3: Rodar verificações e commitar**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: todos passam. Alguns testes podem mostrar warnings de contraste — resolver só se quebrarem.

```bash
git add app/globals.css
git commit -m "feat(design): tokens de cor da paleta verde esmeralda"
```

---

## Task 3: Estender `tailwind.config.ts` com as novas color keys

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Adicionar novas keys de cor**

Substituir o bloco `colors: { ... }` dentro de `theme.extend` por:

```ts
colors: {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  card: {
    DEFAULT: "hsl(var(--card))",
    foreground: "hsl(var(--card-foreground))",
  },
  popover: {
    DEFAULT: "hsl(var(--popover))",
    foreground: "hsl(var(--popover-foreground))",
  },
  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
  },
  secondary: {
    DEFAULT: "hsl(var(--secondary))",
    foreground: "hsl(var(--secondary-foreground))",
  },
  muted: {
    DEFAULT: "hsl(var(--muted))",
    foreground: "hsl(var(--muted-foreground))",
  },
  accent: {
    DEFAULT: "hsl(var(--accent))",
    foreground: "hsl(var(--accent-foreground))",
  },
  destructive: {
    DEFAULT: "hsl(var(--destructive))",
    foreground: "hsl(var(--destructive-foreground))",
  },
  danger: {
    soft: "hsl(var(--danger-soft))",
    text: "hsl(var(--danger-text))",
  },
  warning: {
    DEFAULT: "hsl(var(--warning))",
    soft: "hsl(var(--warning-soft))",
    text: "hsl(var(--warning-text))",
  },
  border: "hsl(var(--border))",
  input: "hsl(var(--input))",
  ring: "hsl(var(--ring))",
  chart: {
    "1": "hsl(var(--chart-1))",
    "2": "hsl(var(--chart-2))",
    "3": "hsl(var(--chart-3))",
    "4": "hsl(var(--chart-4))",
    "5": "hsl(var(--chart-5))",
  },
},
```

Mudanças:
- `destructive` virou `{ DEFAULT, foreground }` (antes era string pura).
- Novas keys: `danger.soft`, `danger.text`, `warning` (com `soft`, `text`, `DEFAULT`).
- Removidas keys `sidebar.*` (não usadas em nenhum componente — verificar com `grep -r "sidebar" components/ app/` antes).

Também adicionar a extensão de `fontFamily` ao `theme.extend`:

```ts
fontFamily: {
  sans: ["var(--font-inter)", "system-ui", "sans-serif"],
},
```

- [ ] **Step 2: Verificar que `sidebar` não é referenciado em lugar nenhum**

Run: `grep -r "bg-sidebar\|text-sidebar\|border-sidebar" components/ app/ | wc -l`
Expected: `0`. Se > 0, manter as keys sidebar ou substituir usos.

- [ ] **Step 3: Verificar que o build compila sem erros**

Run: `pnpm typecheck && pnpm build`
Expected: build completa sem erros. Se algum componente usava `destructive` como string (ex: `text-destructive-foreground`), vai precisar ajustar.

- [ ] **Step 4: Commitar**

```bash
git add tailwind.config.ts
git commit -m "feat(design): estender tailwind config com warning, danger, fonte Inter"
```

---

## Task 4: Utilidade `lib/initials.ts`

**Files:**
- Create: `lib/initials.ts`
- Create: `tests/unit/lib/initials.test.ts`

- [ ] **Step 1: Escrever o teste que falha**

```ts
// tests/unit/lib/initials.test.ts
import { describe, it, expect } from "vitest";
import { initials } from "@/lib/initials";

describe("initials", () => {
  it("extrai iniciais de nome completo (2 letras)", () => {
    expect(initials("Marina Costa")).toBe("MC");
    expect(initials("João Silva")).toBe("JS");
  });

  it("usa as 2 primeiras letras de um nome único", () => {
    expect(initials("Madonna")).toBe("MA");
  });

  it("pega só primeira e última palavra em nomes compostos", () => {
    expect(initials("Maria Aparecida da Silva Santos")).toBe("MS");
  });

  it("retorna string vazia para input vazio", () => {
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
  });

  it("lida com letras maiúsculas e minúsculas", () => {
    expect(initials("joão da silva")).toBe("JS");
  });

  it("ignora espaços extras", () => {
    expect(initials("  Marina   Costa  ")).toBe("MC");
  });
});
```

- [ ] **Step 2: Rodar o teste — deve falhar**

Run: `pnpm test -- initials`
Expected: FAIL — "Cannot find module '@/lib/initials'"

- [ ] **Step 3: Implementar**

```ts
// lib/initials.ts
export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) {
    const only = parts[0]!;
    return (only.slice(0, 2)).toUpperCase();
  }
  const first = parts[0]!;
  const last = parts[parts.length - 1]!;
  return (first[0]! + last[0]!).toUpperCase();
}
```

- [ ] **Step 4: Rodar o teste — deve passar**

Run: `pnpm test -- initials`
Expected: PASS — 6/6 testes.

- [ ] **Step 5: Commitar**

```bash
git add lib/initials.ts tests/unit/lib/initials.test.ts
git commit -m "feat(lib): utilidade initials para avatares"
```

---

## Task 5: Primitivo `components/ui/avatar-initials.tsx`

**Files:**
- Create: `components/ui/avatar-initials.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// components/ui/avatar-initials.tsx
import { cn } from "@/lib/utils";
import { initials } from "@/lib/initials";

type Size = "sm" | "md" | "lg";

const sizeClasses: Record<Size, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function AvatarInitials({
  name,
  size = "md",
  variant = "soft",
  className,
}: {
  name: string;
  size?: Size;
  variant?: "soft" | "solid";
  className?: string;
}) {
  const variantClasses =
    variant === "solid"
      ? "bg-primary text-primary-foreground"
      : "bg-accent text-accent-foreground";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizeClasses[size],
        variantClasses,
        className,
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `pnpm typecheck`
Expected: passa.

- [ ] **Step 3: Commitar**

```bash
git add components/ui/avatar-initials.tsx
git commit -m "feat(ui): componente AvatarInitials"
```

---

## Task 6: Primitivo `components/ui/status-badge.tsx`

**Files:**
- Create: `components/ui/status-badge.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// components/ui/status-badge.tsx
import { cn } from "@/lib/utils";

export type StatusVariant = "pending" | "today" | "overdue" | "paid";

const variantClasses: Record<StatusVariant, string> = {
  pending: "bg-secondary text-secondary-foreground",
  today: "bg-warning-soft text-warning-text",
  overdue: "bg-danger-soft text-danger-text",
  paid: "bg-accent text-accent-foreground",
};

export function StatusBadge({
  variant,
  children,
  className,
}: {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-tight",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `pnpm typecheck`
Expected: passa.

- [ ] **Step 3: Commitar**

```bash
git add components/ui/status-badge.tsx
git commit -m "feat(ui): componente StatusBadge (pending/today/overdue/paid)"
```

---

## Task 7: Primitivo `components/ui/filter-pills.tsx`

**Files:**
- Create: `components/ui/filter-pills.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// components/ui/filter-pills.tsx
"use client";

import { cn } from "@/lib/utils";

export type FilterOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
};

export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: readonly FilterOption<T>[];
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition-colors",
              active
                ? "border-accent bg-accent text-accent-foreground font-semibold"
                : "border-border bg-card text-foreground hover:bg-muted",
            )}
          >
            {opt.label}
            {typeof opt.count === "number" && (
              <span
                className={cn(
                  "ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  active ? "bg-accent-foreground/15" : "bg-foreground/10",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
```

Nota: é client component (usa `onClick`). Páginas que usam vão precisar de wrapper client ou de state management local via `"use client"`.

- [ ] **Step 2: Verificar compilação**

Run: `pnpm typecheck`
Expected: passa.

- [ ] **Step 3: Commitar**

```bash
git add components/ui/filter-pills.tsx
git commit -m "feat(ui): componente FilterPills com contadores"
```

---

## Task 8: Serviço puro `summary.ts` — agregar mês

**Files:**
- Create: `features/charges/services/summary.ts`
- Create: `tests/unit/charges/summary.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

```ts
// tests/unit/charges/summary.test.ts
import { describe, it, expect } from "vitest";
import { buildMonthSummary } from "@/features/charges/services/summary";
import type { Charge } from "@/features/charges/types";

const base: Omit<Charge, "id" | "due_date" | "status" | "paid_at" | "amount_cents"> = {
  owner_id: "u1",
  client_id: "c1",
  notes: null,
  paid_amount_cents: null,
  payment_method: null,
  created_at: "2026-04-01T00:00:00+00:00",
  updated_at: "2026-04-01T00:00:00+00:00",
  deleted_at: null,
} as unknown as Charge;

function c(id: string, dueDate: string, status: Charge["status"], amount: number, paidAt?: string): Charge {
  return {
    ...base,
    id,
    due_date: dueDate,
    status,
    amount_cents: amount,
    paid_at: paidAt ?? null,
  } as unknown as Charge;
}

describe("buildMonthSummary", () => {
  const today = "2026-04-20";
  const yyyyMm = "2026-04";

  it("soma pendentes com due_date no mês", () => {
    const s = buildMonthSummary(
      [c("1", "2026-04-15", "pending", 10000), c("2", "2026-04-25", "pending", 20000)],
      today,
      yyyyMm,
    );
    expect(s.receivable.cents).toBe(30000);
    expect(s.receivable.count).toBe(2);
  });

  it("conta em atraso como pendentes com due_date < today (qualquer mês)", () => {
    const s = buildMonthSummary(
      [
        c("1", "2026-03-10", "pending", 10000), // atraso mês anterior
        c("2", "2026-04-15", "pending", 20000), // atraso mês atual
        c("3", "2026-04-25", "pending", 30000), // ainda vai vencer
      ],
      today,
      yyyyMm,
    );
    expect(s.overdue.cents).toBe(30000);
    expect(s.overdue.count).toBe(2);
  });

  it("soma pagos com paid_at no mês", () => {
    const s = buildMonthSummary(
      [
        c("1", "2026-04-05", "paid", 10000, "2026-04-05T12:00:00+00:00"),
        c("2", "2026-03-15", "paid", 20000, "2026-04-02T12:00:00+00:00"), // pago em abril mesmo que venceu março
        c("3", "2026-04-05", "paid", 30000, "2026-03-30T12:00:00+00:00"), // pago março
      ],
      today,
      yyyyMm,
    );
    expect(s.received.cents).toBe(30000);
    expect(s.received.count).toBe(2);
  });

  it("ignora canceladas e deletadas", () => {
    const s = buildMonthSummary(
      [
        c("1", "2026-04-15", "canceled", 10000),
        { ...c("2", "2026-04-15", "pending", 20000), deleted_at: "2026-04-10T00:00:00+00:00" } as Charge,
      ],
      today,
      yyyyMm,
    );
    expect(s.receivable.cents).toBe(0);
    expect(s.overdue.cents).toBe(0);
    expect(s.received.cents).toBe(0);
  });

  it("retorna zero quando não há charges", () => {
    const s = buildMonthSummary([], today, yyyyMm);
    expect(s).toEqual({
      yyyyMm,
      receivable: { cents: 0, count: 0 },
      overdue: { cents: 0, count: 0 },
      received: { cents: 0, count: 0 },
    });
  });
});
```

- [ ] **Step 2: Rodar teste — deve falhar**

Run: `pnpm test -- summary`
Expected: FAIL — "Cannot find module '@/features/charges/services/summary'"

- [ ] **Step 3: Implementar**

```ts
// features/charges/services/summary.ts
import type { Charge } from "@/features/charges/types";

export type MonthSummary = {
  yyyyMm: string;
  receivable: { cents: number; count: number };
  overdue: { cents: number; count: number };
  received: { cents: number; count: number };
};

export function buildMonthSummary(
  charges: readonly Charge[],
  todayISO: string,
  yyyyMm: string,
): MonthSummary {
  const alive = charges.filter((c) => !c.deleted_at);

  const inMonth = (dateISO: string): boolean => dateISO.startsWith(`${yyyyMm}-`);
  const paidAtInMonth = (paidAt: string | null): boolean =>
    !!paidAt && paidAt.startsWith(`${yyyyMm}-`);

  const receivableCharges = alive.filter(
    (c) => c.status === "pending" && inMonth(c.due_date),
  );
  const overdueCharges = alive.filter(
    (c) => c.status === "pending" && c.due_date < todayISO,
  );
  const receivedCharges = alive.filter(
    (c) => c.status === "paid" && paidAtInMonth(c.paid_at),
  );

  const sum = (list: readonly Charge[]) =>
    list.reduce<{ cents: number; count: number }>(
      (acc, x) => {
        const amt = x.paid_amount_cents ?? x.amount_cents;
        return { cents: acc.cents + amt, count: acc.count + 1 };
      },
      { cents: 0, count: 0 },
    );

  return {
    yyyyMm,
    receivable: sum(receivableCharges),
    overdue: sum(overdueCharges),
    received: sum(receivedCharges),
  };
}
```

- [ ] **Step 4: Rodar teste — deve passar**

Run: `pnpm test -- summary`
Expected: PASS — 5/5 testes.

- [ ] **Step 5: Commitar**

```bash
git add features/charges/services/summary.ts tests/unit/charges/summary.test.ts
git commit -m "feat(charges): serviço puro buildMonthSummary"
```

---

## Task 9: Query `listMonthSummaryCharges` + `listUpcomingCharges`

**Files:**
- Modify: `features/charges/queries.ts`

- [ ] **Step 1: Adicionar as duas novas queries ao final do arquivo**

Adicionar ao final de `features/charges/queries.ts` (antes da chave final `}` do arquivo — na verdade não há chave final, é só adicionar após a última função):

```ts
/**
 * Retorna todas as charges relevantes pra computar o resumo mensal:
 * - pendentes com due_date no mês ou antes (pra contar "em atraso" de qualquer mês)
 * - pagas com paid_at no mês
 *
 * O filtro preciso é feito em `buildMonthSummary` (serviço puro, testável).
 */
export async function listMonthSummaryCharges(yyyyMm: string): Promise<Charge[]> {
  const supabase = createClient();
  const monthStart = `${yyyyMm}-01`;
  // yyyy-mm-31 cobre qualquer mês com folga — o serviço filtra com startsWith
  const monthEnd = `${yyyyMm}-31`;
  const paidFromTs = `${monthStart}T00:00:00+00:00`;
  const paidToTs = `${yyyyMm}-31T23:59:59+00:00`;

  const { data, error } = await supabase
    .from("charges")
    .select("*")
    .is("deleted_at", null)
    .or(
      [
        `and(status.eq.pending,due_date.lte.${monthEnd})`,
        `and(status.eq.paid,paid_at.gte.${paidFromTs},paid_at.lte.${paidToTs})`,
      ].join(","),
    );
  if (error) throw new Error(error.message);
  return (data ?? []) as Charge[];
}

/**
 * Próximas cobranças pendentes, a partir de amanhã (exclusive today).
 * Usado pelo painel lateral do /hoje desktop.
 */
export async function listUpcomingCharges(
  todayISO: string,
  limit = 5,
): Promise<ChargeWithClient[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("charges")
    .select("*, client:clients!inner(id, name, phone_e164)")
    .eq("status", "pending")
    .gt("due_date", todayISO)
    .is("deleted_at", null)
    .order("due_date", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ChargeWithClient[];
}
```

- [ ] **Step 2: Verificar compilação**

Run: `pnpm typecheck`
Expected: passa.

- [ ] **Step 3: Commitar**

```bash
git add features/charges/queries.ts
git commit -m "feat(charges): queries listMonthSummaryCharges e listUpcomingCharges"
```

---

## Task 10: Primitivo `components/ui/hero-summary.tsx`

**Files:**
- Create: `components/ui/hero-summary.tsx`

- [ ] **Step 1: Criar o componente**

```tsx
// components/ui/hero-summary.tsx
import { cn } from "@/lib/utils";

type Metric = {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "danger" | "success";
};

export function HeroSummary({
  label,
  value,
  sub,
  secondary,
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  secondary?: [Metric, Metric];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card to-[hsl(152_76%_96%)] p-5 md:p-6",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl"
      />
      <div className="relative z-10">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-[28px] font-bold leading-none tracking-tight tabular-nums md:text-4xl">
          {value}
        </div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}

        {secondary && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-black/5 pt-3">
            {secondary.map((m, i) => (
              <div key={i}>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {m.label}
                </div>
                <div
                  className={cn(
                    "mt-0.5 text-base font-bold tabular-nums",
                    m.tone === "danger" && "text-danger-text",
                    m.tone === "success" && "text-accent-foreground",
                  )}
                >
                  {m.value}
                </div>
                {m.sub && <div className="text-[11px] text-muted-foreground">{m.sub}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilação**

Run: `pnpm typecheck`
Expected: passa.

- [ ] **Step 3: Commitar**

```bash
git add components/ui/hero-summary.tsx
git commit -m "feat(ui): componente HeroSummary"
```

---

## Task 11: Refatorar `components/Nav.tsx`

**Files:**
- Modify: `components/Nav.tsx`

- [ ] **Step 1: Substituir arquivo inteiro**

```tsx
// components/Nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, PieChart, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const ITEMS: readonly Item[] = [
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
    <nav
      className={cn(
        "fixed inset-x-3 bottom-3 z-40 flex items-stretch gap-1 rounded-2xl border border-border bg-card p-1.5",
        "shadow-[0_8px_24px_rgba(10,10,10,0.06)]",
        "lg:hidden",
      )}
      aria-label="Navegação inferior"
    >
      {ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground font-semibold"
                : "text-muted-foreground hover:bg-muted",
            )}
            aria-current={active ? "page" : undefined}
          >
            <item.Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function SideNav({ userLabel }: { userLabel?: { name: string; plan: string } }) {
  const pathname = usePathname();
  return (
    <nav
      className="hidden w-56 shrink-0 flex-col border-r border-border bg-card p-3 lg:flex"
      aria-label="Navegação lateral"
    >
      <div className="flex items-center gap-2.5 px-2 pb-4 pt-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-primary text-sm font-bold text-primary-foreground">
          DP
        </div>
        <span className="text-sm font-bold tracking-tight">EtherPay</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "text-muted-foreground hover:bg-muted",
              )}
              aria-current={active ? "page" : undefined}
            >
              <item.Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {userLabel && (
        <div className="mt-auto flex items-center gap-2.5 border-t border-border pt-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
            {userLabel.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold">{userLabel.name}</div>
            <div className="truncate text-[11px] text-muted-foreground">{userLabel.plan}</div>
          </div>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Atualizar `app/(app)/layout.tsx` para passar `userLabel`**

Substituir o bloco atual por:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav, SideNav } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const email = user.email ?? "";
  const name = email.split("@")[0] ?? "Professor";

  return (
    <div className="flex min-h-screen">
      <SideNav userLabel={{ name, plan: "Plano grátis" }} />
      <main className="flex-1 px-4 py-6 pb-28 lg:px-8 lg:py-8 lg:pb-8">{children}</main>
      <BottomNav />
    </div>
  );
}
```

Mudanças:
- Removido `TopBar` (substituído por cabeçalho próprio em cada página + SideNav com usuário no rodapé)
- `pb-28` em mobile pra dar espaço pra BottomNav flutuante
- Padding lateral maior em desktop (`lg:px-8`)

- [ ] **Step 3: Rodar dev server e inspecionar `/hoje`**

Run: `pnpm dev`
Expected:
- Mobile: BottomNav flutuante com fundo verde suave na aba ativa
- Desktop: SideNav mostra "EtherPay" + itens + rodapé com iniciais do usuário

- [ ] **Step 4: Rodar e2e para confirmar que seletores existentes ainda funcionam**

Run: `pnpm test:e2e` (ou comando equivalente do repo — conferir `package.json`)
Expected: todos os specs passam. Se `smoke.spec.ts` buscar por "Sair" ou "sign-out" no TopBar, isso precisa ser movido pra outro lugar — se sim, agora NÃO estamos quebrando nada porque o TopBar foi removido. Adicionar link de sair dentro do SideNav rodapé (em nova task se necessário).

- [ ] **Step 5: Se algum teste quebrar por falta de link "Sair"**

Adicionar no rodapé do SideNav e um botão "Sair" em `BottomNav` mobile (menu `⋯` no canto), OU mover o logout pro /ajustes/conta (já existe lá). Preferir a segunda opção — remover qualquer seletor e2e que dependia do TopBar.

- [ ] **Step 6: Commitar**

```bash
git add components/Nav.tsx app/\(app\)/layout.tsx
git commit -m "refactor(nav): SideNav com brand+rodapé e BottomNav flutuante"
```

---

## Task 12: Refatorar `components/ChargeRow.tsx`

**Files:**
- Modify: `components/ChargeRow.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
// components/ChargeRow.tsx
import Link from "next/link";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatBRL } from "@/lib/money";
import { isoToBRDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { ChargeWithClient } from "@/features/charges/types";

type Props = {
  charge: ChargeWithClient;
  tone: "today" | "overdue" | "paid";
  overdueDays?: number;
  action?: React.ReactNode;
};

export function ChargeRow({ charge, tone, overdueDays, action }: Props) {
  const overdue = tone === "overdue";
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border bg-card p-3",
        overdue && "border-l-[3px] border-l-destructive",
      )}
    >
      <AvatarInitials name={charge.client.name} size="md" />
      <Link href={`/cobrancas/${charge.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{charge.client.name}</span>
          {tone === "today" && <StatusBadge variant="today">Hoje</StatusBadge>}
          {tone === "overdue" && (
            <StatusBadge variant="overdue">
              {overdueDays && overdueDays > 0 ? `${overdueDays}d` : "Atraso"}
            </StatusBadge>
          )}
          {tone === "paid" && <StatusBadge variant="paid">Pago</StatusBadge>}
        </div>
        <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
          Vence {isoToBRDate(charge.due_date)}
        </div>
      </Link>
      <div className="text-right text-sm font-bold tabular-nums">
        {formatBRL(charge.amount_cents)}
      </div>
      {action && <div className="ml-1">{action}</div>}
    </div>
  );
}
```

Mudanças:
- Avatar com iniciais à esquerda (era só texto)
- Borda esquerda vermelha 3px quando `overdue`
- StatusBadge integrada inline no título
- Novo tone `"paid"` pra listar pagas na tela `/hoje`
- Data em `isoToBRDate` sem prefixo "em" (menos verbose)
- Valor em `tabular-nums`

- [ ] **Step 2: Rodar typecheck + testes**

Run: `pnpm typecheck && pnpm test`
Expected: passa. (`/hoje` ainda funciona porque a API do componente manteve tone="today"/"overdue".)

- [ ] **Step 3: Commitar**

```bash
git add components/ChargeRow.tsx
git commit -m "refactor(charges): ChargeRow com avatar, badge e borda de atraso"
```

---

## Task 13: Refatorar `components/ClientRow.tsx`

**Files:**
- Modify: `components/ClientRow.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
// components/ClientRow.tsx
import Link from "next/link";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { formatBRL } from "@/lib/money";
import type { Client } from "@/features/clients/types";

const cycleLabel: Record<Client["cycle_kind"], string> = {
  days: "Diário",
  weeks: "Semanal",
  months: "Mensal",
};

export function ClientRow({
  client,
  nextLabel,
  status = "ok",
}: {
  client: Client;
  nextLabel?: string;
  status?: "ok" | "overdue";
}) {
  return (
    <Link
      href={`/clientes/${client.id}`}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-foreground/20"
    >
      <AvatarInitials name={client.name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{client.name}</div>
        <div className="text-[11px] tabular-nums text-muted-foreground">
          {cycleLabel[client.cycle_kind]} · {formatBRL(client.default_amount_cents)}
        </div>
      </div>
      {nextLabel && (
        <div
          className={`text-[11px] font-semibold tabular-nums ${
            status === "overdue" ? "text-danger-text" : "text-muted-foreground"
          }`}
        >
          {nextLabel}
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `pnpm typecheck`
Expected: passa. Páginas que passam `<ClientRow client={c} />` sem `nextLabel` continuam funcionando (prop opcional).

- [ ] **Step 3: Commitar**

```bash
git add components/ClientRow.tsx
git commit -m "refactor(clients): ClientRow com avatar e status de pendência opcional"
```

---

## Task 14: Refatorar `app/(app)/hoje/page.tsx`

**Files:**
- Modify: `app/(app)/hoje/page.tsx`
- Create: `components/HojeFilterPills.tsx` (wrapper client — state local do filtro)

- [ ] **Step 1: Criar o wrapper client dos pills**

```tsx
// components/HojeFilterPills.tsx
"use client";

import { useState, useMemo } from "react";
import { FilterPills } from "@/components/ui/filter-pills";
import { ChargeRow } from "@/components/ChargeRow";
import { ChargeRowActions } from "@/components/ChargeRowActions";
import type { ChargeWithClient } from "@/features/charges/types";

type Filter = "all" | "pending" | "overdue" | "paid";

export function HojeFilterPills({
  today,
  overdue,
  paid,
  template,
  todayISO,
}: {
  today: ChargeWithClient[];
  overdue: ChargeWithClient[];
  paid: ChargeWithClient[];
  template: string;
  todayISO: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const counts = {
    all: today.length + overdue.length + paid.length,
    pending: today.length,
    overdue: overdue.length,
    paid: paid.length,
  };

  const showOverdue = filter === "all" || filter === "overdue";
  const showToday = filter === "all" || filter === "pending";
  const showPaid = filter === "all" || filter === "paid";

  const overdueDays = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of overdue) {
      const diff = Math.floor(
        (new Date(todayISO).getTime() - new Date(c.due_date).getTime()) / 86400000,
      );
      map.set(c.id, Math.max(1, diff));
    }
    return map;
  }, [overdue, todayISO]);

  const actionFor = (c: ChargeWithClient) => (
    <ChargeRowActions
      chargeId={c.id}
      amountCents={c.amount_cents}
      dueDateISO={c.due_date}
      clientName={c.client.name}
      clientPhone={c.client.phone_e164}
      template={template}
    />
  );

  return (
    <>
      <FilterPills<Filter>
        options={[
          { value: "all", label: "Todas", count: counts.all },
          { value: "pending", label: "Pendentes", count: counts.pending },
          { value: "overdue", label: "Em atraso", count: counts.overdue },
          { value: "paid", label: "Pagas", count: counts.paid },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {showOverdue && overdue.length > 0 && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Em atraso
            <span className="rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-danger-text">
              {overdue.length}
            </span>
          </h2>
          <div className="space-y-2">
            {overdue.map((c) => (
              <ChargeRow
                key={c.id}
                charge={c}
                tone="overdue"
                overdueDays={overdueDays.get(c.id)}
                action={actionFor(c)}
              />
            ))}
          </div>
        </div>
      )}

      {showToday && today.length > 0 && (
        <div className="space-y-2">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Hoje
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
              {today.length}
            </span>
          </h2>
          <div className="space-y-2">
            {today.map((c) => (
              <ChargeRow key={c.id} charge={c} tone="today" action={actionFor(c)} />
            ))}
          </div>
        </div>
      )}

      {showPaid && paid.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Pagas hoje
          </h2>
          <div className="space-y-2">
            {paid.map((c) => (
              <ChargeRow key={c.id} charge={c} tone="paid" />
            ))}
          </div>
        </div>
      )}

      {counts.all === 0 && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nada para hoje. Quando uma cobrança vencer, ela aparece aqui.
        </p>
      )}
    </>
  );
}
```

- [ ] **Step 2: Substituir `app/(app)/hoje/page.tsx`**

```tsx
import { HeroSummary } from "@/components/ui/hero-summary";
import { HojeFilterPills } from "@/components/HojeFilterPills";
import { PWAInstallHint } from "@/components/PWAInstallHint";
import { formatBRL } from "@/lib/money";
import { formatISODate } from "@/lib/date";
import {
  listTodayAndOverdueCharges,
  listMonthSummaryCharges,
} from "@/features/charges/queries";
import { classifyToday } from "@/features/charges/services/classify";
import { buildMonthSummary } from "@/features/charges/services/summary";
import { topUpAllClients } from "@/features/charges/actions";
import { getSettings } from "@/features/settings/queries";

export const dynamic = "force-dynamic";

const MONTH_LABELS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default async function HojePage() {
  await topUpAllClients();

  const now = new Date();
  const todayISO = formatISODate(now);
  const yyyyMm = todayISO.slice(0, 7);
  const monthName = MONTH_LABELS[now.getUTCMonth()];

  const [todayAndOverdue, monthCharges, settings] = await Promise.all([
    listTodayAndOverdueCharges(todayISO),
    listMonthSummaryCharges(yyyyMm),
    getSettings(),
  ]);
  const { today, overdue } = classifyToday(todayAndOverdue, todayISO);
  const summary = buildMonthSummary(monthCharges, todayISO, yyyyMm);
  const template = settings?.message_template ?? "";

  const todayFormatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(now);

  return (
    <section className="mx-auto max-w-2xl space-y-5 lg:max-w-5xl">
      <header>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Hoje</h1>
        <p className="text-xs capitalize text-muted-foreground">{todayFormatted}</p>
      </header>

      <PWAInstallHint />

      <HeroSummary
        label="A receber no mês"
        value={formatBRL(summary.receivable.cents)}
        sub={`${summary.receivable.count} ${summary.receivable.count === 1 ? "cobrança" : "cobranças"} · ${monthName}`}
        secondary={[
          {
            label: "Em atraso",
            value: formatBRL(summary.overdue.cents),
            sub: `${summary.overdue.count} ${summary.overdue.count === 1 ? "cobrança" : "cobranças"}`,
            tone: "danger",
          },
          {
            label: "Recebido",
            value: formatBRL(summary.received.cents),
            sub: `${summary.received.count} ${summary.received.count === 1 ? "cobrança" : "cobranças"}`,
            tone: "success",
          },
        ]}
      />

      <HojeFilterPills
        today={today}
        overdue={overdue}
        paid={[]}
        template={template}
        todayISO={todayISO}
      />
    </section>
  );
}
```

Nota: `paid={[]}` por enquanto — a query atual não retorna cobranças pagas hoje. Se quiser adicionar depois, criar query dedicada `listPaidToday`. Mantido como escopo futuro.

- [ ] **Step 3: Verificar visualmente no dev server**

Run: `pnpm dev`, logar e abrir `/hoje`
Expected:
- Hero mostra "A receber no mês" com valor grande e duas métricas secundárias
- Pills renderizam com contadores
- Clicar em cada pill filtra as listas
- Mobile: BottomNav flutuante não sobrepõe conteúdo (tem `pb-28` no layout)

- [ ] **Step 4: Rodar verificações e e2e**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`
Expected: todos passam. Se `hoje` spec quebrar por seletor, atualizar no mesmo commit.

- [ ] **Step 5: Commitar**

```bash
git add app/\(app\)/hoje/page.tsx components/HojeFilterPills.tsx
git commit -m "refactor(hoje): Hero mensal + pills de filtro com contadores"
```

---

## Task 15: `UpcomingChargesPanel` + wire-up no `/hoje` desktop

**Files:**
- Create: `components/UpcomingChargesPanel.tsx`
- Modify: `app/(app)/hoje/page.tsx`

- [ ] **Step 1: Criar o painel**

```tsx
// components/UpcomingChargesPanel.tsx
import Link from "next/link";
import { formatBRL } from "@/lib/money";
import type { ChargeWithClient } from "@/features/charges/types";

const MONTHS_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

function parseDate(iso: string): { d: string; m: string } {
  const [, mm, dd] = iso.split("-");
  return {
    d: dd ?? "--",
    m: MONTHS_SHORT[Number.parseInt(mm ?? "1", 10) - 1] ?? "",
  };
}

export function UpcomingChargesPanel({ upcoming }: { upcoming: ChargeWithClient[] }) {
  return (
    <aside className="rounded-2xl border border-border bg-card p-5">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Próximas cobranças
      </h4>

      {upcoming.length === 0 ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Sem cobranças agendadas pros próximos dias.
        </p>
      ) : (
        <div className="mt-3 divide-y divide-border/60">
          {upcoming.map((c) => {
            const { d, m } = parseDate(c.due_date);
            return (
              <Link
                key={c.id}
                href={`/cobrancas/${c.id}`}
                className="flex items-center gap-3 py-2.5 hover:opacity-80"
              >
                <div className="w-10 text-center">
                  <div className="text-base font-bold tabular-nums">{d}</div>
                  <div className="text-[10px] uppercase text-muted-foreground">{m}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold">{c.client.name}</div>
                </div>
                <div className="text-xs font-bold tabular-nums">
                  {formatBRL(c.amount_cents)}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Integrar no `/hoje` — layout 2-col em desktop**

Substituir o `return` de `app/(app)/hoje/page.tsx` por esta versão (mantendo todas as queries anteriores, **adicionando** `listUpcomingCharges`):

Adicionar import:
```ts
import { listUpcomingCharges } from "@/features/charges/queries";
import { UpcomingChargesPanel } from "@/components/UpcomingChargesPanel";
```

Modificar o `Promise.all` pra incluir a nova query:
```ts
const [todayAndOverdue, monthCharges, settings, upcoming] = await Promise.all([
  listTodayAndOverdueCharges(todayISO),
  listMonthSummaryCharges(yyyyMm),
  getSettings(),
  listUpcomingCharges(todayISO, 5),
]);
```

Mudar o JSX pra um layout de grid no desktop:
```tsx
return (
  <section className="mx-auto space-y-5 lg:max-w-6xl">
    <header>
      <h1 className="text-[28px] font-bold leading-tight tracking-tight">Hoje</h1>
      <p className="text-xs capitalize text-muted-foreground">{todayFormatted}</p>
    </header>

    <PWAInstallHint />

    <HeroSummary
      label="A receber no mês"
      value={formatBRL(summary.receivable.cents)}
      sub={`${summary.receivable.count} ${summary.receivable.count === 1 ? "cobrança" : "cobranças"} · ${monthName}`}
      secondary={[/* mesmas que antes */]}
    />

    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <HojeFilterPills
          today={today}
          overdue={overdue}
          paid={[]}
          template={template}
          todayISO={todayISO}
        />
      </div>
      <div className="hidden lg:block">
        <UpcomingChargesPanel upcoming={upcoming} />
      </div>
    </div>
  </section>
);
```

Nota: no mobile (lg: hidden) o painel desaparece — intencional.

- [ ] **Step 3: Verificar visualmente em 1200px e 375px**

Run: `pnpm dev`, usar DevTools pra alternar tamanhos
Expected:
- Desktop: 2 colunas, painel "Próximas" à direita
- Mobile: apenas lista + pills, sem painel

- [ ] **Step 4: Commitar**

```bash
git add components/UpcomingChargesPanel.tsx app/\(app\)/hoje/page.tsx
git commit -m "feat(hoje): painel Próximas cobranças no desktop"
```

---

## Task 16: Refatorar `app/(app)/clientes/page.tsx`

**Files:**
- Modify: `app/(app)/clientes/page.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ClientRow } from "@/components/ClientRow";
import { EmptyState } from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { listClients } from "@/features/clients/queries";
import { listTodayAndOverdueCharges } from "@/features/charges/queries";
import { classifyToday } from "@/features/charges/services/classify";
import { canAddClient } from "@/features/billing/gate";
import { formatISODate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const todayISO = formatISODate(new Date());
  const [clients, allowedToAdd, rows] = await Promise.all([
    listClients(),
    canAddClient(user.id),
    listTodayAndOverdueCharges(todayISO),
  ]);
  const { overdue } = classifyToday(rows, todayISO);
  const overdueByClient = new Map<string, number>();
  for (const c of overdue) {
    const diff = Math.floor(
      (new Date(todayISO).getTime() - new Date(c.due_date).getTime()) / 86400000,
    );
    const prev = overdueByClient.get(c.client_id) ?? 0;
    overdueByClient.set(c.client_id, Math.max(prev, diff));
  }

  const addButton = allowedToAdd ? (
    <Button asChild>
      <Link href="/clientes/novo">+ Adicionar</Link>
    </Button>
  ) : (
    <Button disabled>Limite atingido</Button>
  );

  const emptyAction = allowedToAdd ? (
    <Button asChild>
      <Link href="/clientes/novo">+ Adicionar cliente</Link>
    </Button>
  ) : null;

  const withOverdue = clients.filter((c) => overdueByClient.has(c.id));
  const onTrack = clients.filter((c) => !overdueByClient.has(c.id));

  return (
    <section className="mx-auto max-w-2xl space-y-5 lg:max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">Clientes</h1>
          <p className="text-xs text-muted-foreground">
            {clients.length} {clients.length === 1 ? "cliente" : "clientes"}
          </p>
        </div>
        {addButton}
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente ainda"
          description="Adicione seu primeiro cliente para começar."
          action={emptyAction ?? undefined}
        />
      ) : (
        <>
          {withOverdue.length > 0 && (
            <div className="space-y-2">
              <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Com pendência
                <span className="rounded-full bg-danger-soft px-1.5 py-0.5 text-[10px] font-bold text-danger-text">
                  {withOverdue.length}
                </span>
              </h2>
              <div className="space-y-2">
                {withOverdue.map((c) => (
                  <ClientRow
                    key={c.id}
                    client={c}
                    status="overdue"
                    nextLabel={`atraso ${overdueByClient.get(c.id) ?? 0}d`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {withOverdue.length > 0 ? "Em dia" : "Todos os clientes"}
            </h2>
            <div className="space-y-2">
              {onTrack.map((c) => (
                <ClientRow key={c.id} client={c} />
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
```

Mudanças:
- Título maior + subtítulo com contagem
- Botão "+ Adicionar" com `+` inline
- Separação "Com pendência" vs "Em dia" quando há atrasos
- Cada ClientRow com avatar + label de atraso se aplicável

- [ ] **Step 2: Verificar visualmente**

Run: `pnpm dev`, navegar até `/clientes`
Expected: lista renderiza com avatars, clientes em atraso aparecem em cima com label vermelho.

- [ ] **Step 3: Commitar**

```bash
git add app/\(app\)/clientes/page.tsx
git commit -m "refactor(clientes): lista com avatar, status de pendência e agrupamento"
```

---

## Task 17: Refatorar `app/(app)/cobrancas/[id]/page.tsx`

**Files:**
- Modify: `app/(app)/cobrancas/[id]/page.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ChargeDetailForm } from "@/components/ChargeDetailForm";
import { MarkPaidDialog } from "@/components/MarkPaidDialog";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { formatBRL } from "@/lib/money";
import { formatISODate, isoToBRDate } from "@/lib/date";
import {
  getChargeWithClient,
  listAttachmentsForCharge,
} from "@/features/charges/queries";
import { cancelChargeAction } from "@/features/charges/actions";
import { getSettings } from "@/features/settings/queries";
import { AttachmentsGrid } from "@/components/AttachmentsGrid";
import { ReceiptUploadButton } from "@/components/ReceiptUploadButton";

export const dynamic = "force-dynamic";

const CYCLE_LABEL = { days: "Diário", weeks: "Semanal", months: "Mensal" } as const;

export default async function ChargeDetailPage({ params }: { params: { id: string } }) {
  const charge = await getChargeWithClient(params.id);
  if (!charge) notFound();

  const todayISO = formatISODate(new Date());
  const isOverdue = charge.status === "pending" && charge.due_date < todayISO;
  const isDueToday = charge.status === "pending" && charge.due_date === todayISO;
  const clientId = charge.client.id;

  const settings = await getSettings();
  const template = settings?.message_template ?? "";

  const attachments = await listAttachmentsForCharge(charge.id);
  const ownerId = charge.owner_id;

  async function cancel() {
    "use server";
    const result = await cancelChargeAction(params.id);
    if (result?.error) return;
    redirect(`/clientes/${clientId}`);
  }

  const overdueDays = isOverdue
    ? Math.floor(
        (new Date(todayISO).getTime() - new Date(charge.due_date).getTime()) / 86400000,
      )
    : 0;

  return (
    <section className="mx-auto max-w-lg space-y-4">
      <Link
        href={`/clientes/${clientId}`}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> {charge.client.name}
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Valor
        </div>
        <div className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
          {formatBRL(charge.amount_cents)}
        </div>
        <div className="mt-2">
          {charge.status === "paid" && <StatusBadge variant="paid">Paga</StatusBadge>}
          {isOverdue && (
            <StatusBadge variant="overdue">Em atraso · {overdueDays} dias</StatusBadge>
          )}
          {isDueToday && <StatusBadge variant="today">Vence hoje</StatusBadge>}
          {charge.status === "pending" && !isOverdue && !isDueToday && (
            <StatusBadge variant="pending">Pendente</StatusBadge>
          )}
          {charge.status === "canceled" && (
            <StatusBadge variant="pending">Cancelada</StatusBadge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <DetailRow k="Vencimento" v={isoToBRDate(charge.due_date)} />
        <DetailRow k="Ciclo" v={CYCLE_LABEL[charge.client.cycle_kind as keyof typeof CYCLE_LABEL] ?? "—"} />
        {charge.status === "paid" && (
          <>
            <DetailRow
              k="Pago em"
              v={charge.paid_at ? isoToBRDate(charge.paid_at.slice(0, 10)) : "—"}
            />
            <DetailRow
              k="Valor recebido"
              v={formatBRL(charge.paid_amount_cents ?? charge.amount_cents)}
            />
            <DetailRow k="Forma" v={charge.payment_method ?? "—"} />
          </>
        )}
      </div>

      {charge.status === "pending" && (
        <>
          <ChargeDetailForm
            chargeId={charge.id}
            initialAmountCents={charge.amount_cents}
            initialNotes={charge.notes}
          />

          <div className="space-y-2 pt-2">
            <MarkPaidDialog
              chargeId={charge.id}
              defaultAmountCents={charge.amount_cents}
              trigger={
                <Button className="w-full" size="lg">
                  ✓ Marcar como pago
                </Button>
              }
            />
            <WhatsAppButton
              template={template}
              clientName={charge.client.name}
              clientPhone={charge.client.phone_e164}
              amountCents={charge.amount_cents}
              dueDateISO={charge.due_date}
              variant="outline"
              size="default"
              label="💬 Notificar pelo WhatsApp"
            />
            <form action={cancel}>
              <Button type="submit" variant="outline" className="w-full">
                Cancelar cobrança
              </Button>
            </form>
          </div>
        </>
      )}

      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Comprovantes
          </h2>
          <ReceiptUploadButton chargeId={charge.id} ownerId={ownerId} />
        </div>
        {attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum anexo ainda.</p>
        ) : (
          <AttachmentsGrid attachments={attachments} />
        )}
      </div>
    </section>
  );
}

function DetailRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="text-sm font-semibold tabular-nums">{v}</span>
    </div>
  );
}
```

Mudanças:
- Hero central com valor grande + StatusBadge
- Detail rows como cards empilhados
- Ações empilhadas (primary verde + WhatsApp ghost + Cancelar ghost)
- `charge.client.cycle_kind` — ATENÇÃO: o tipo `ChargeWithClient` pode não incluir cycle_kind. Checar o tipo antes de usar. Se não incluir, remover a linha `<DetailRow k="Ciclo" ... />` ou adicionar join na query.

- [ ] **Step 2: Verificar tipo de `ChargeWithClient`**

Run: `grep -A 10 "ChargeWithClient" features/charges/types.ts`
Expected: ver campos. Se `cycle_kind` não vem, remover a linha Ciclo no step anterior.

- [ ] **Step 3: Rodar typecheck**

Run: `pnpm typecheck`
Expected: passa. Se não, ajustar.

- [ ] **Step 4: Verificar visualmente**

Run: `pnpm dev`, abrir uma cobrança existente
Expected: hero central com valor, badge de status, linhas de detalhes, ações empilhadas.

- [ ] **Step 5: Commitar**

```bash
git add app/\(app\)/cobrancas/\[id\]/page.tsx
git commit -m "refactor(cobrancas): detalhe com hero central e ações empilhadas"
```

---

## Task 18: Refatorar `app/(app)/relatorios/page.tsx`

**Files:**
- Modify: `app/(app)/relatorios/page.tsx`

- [ ] **Step 1: Substituir o arquivo**

```tsx
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { HeroSummary } from "@/components/ui/hero-summary";
import { formatBRL } from "@/lib/money";
import { monthBoundsUTC } from "@/lib/date";
import { listAllPaidCharges } from "@/features/reports/queries";
import {
  groupPaidByMonth,
  sumEarnings,
} from "@/features/reports/services/aggregate";

export const dynamic = "force-dynamic";

const MONTH_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function labelFor(yyyyMm: string): string {
  const [yearStr, monthStr] = yyyyMm.split("-");
  const monthIdx = Number.parseInt(monthStr ?? "1", 10) - 1;
  return `${MONTH_FULL[monthIdx] ?? monthStr} ${yearStr}`;
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
    <section className="mx-auto max-w-2xl space-y-5 lg:max-w-4xl">
      <header>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Relatórios</h1>
        <p className="text-xs text-muted-foreground">
          {labelFor(`${currentYear}-${String(currentMonth).padStart(2, "0")}`)}
        </p>
      </header>

      <HeroSummary
        label="Recebido no mês"
        value={formatBRL(currentMonthTotal)}
        sub={`${currentMonthPaid.length} ${currentMonthPaid.length === 1 ? "cobrança paga" : "cobranças pagas"}`}
      />

      <div className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Histórico
        </h2>
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
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-foreground/20"
              >
                <div>
                  <div className="text-sm font-semibold">{labelFor(m.month)}</div>
                  <div className="text-[11px] tabular-nums text-muted-foreground">
                    {m.count} {m.count === 1 ? "cobrança" : "cobranças"}
                  </div>
                </div>
                <div className="text-sm font-bold tabular-nums">
                  {formatBRL(m.total_cents)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
```

Nota: KPI grid 2x2 e bar chart do mockup ficam pro v2 (escopo fora deste plano). Este refactor entrega a mesma função da tela atual mas com tokens novos, hero do sistema, e cards consistentes.

- [ ] **Step 2: Commitar**

```bash
git add app/\(app\)/relatorios/page.tsx
git commit -m "refactor(relatorios): Hero mensal + lista histórica com novo visual"
```

---

## Task 19: Verificação final + ajuste de detalhes

**Files:**
- Possivelmente: `components/EmptyState.tsx`, `components/TopBar.tsx` (remover se não usado), qualquer outro que use cores antigas.

- [ ] **Step 1: Rodar toda a bateria de testes**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
Expected: todos passam sem warnings novos.

- [ ] **Step 2: Rodar Playwright e2e completo**

Run: `pnpm test:e2e`
Expected: todos os 4 specs (smoke, clients, charges, ajustes-and-reports) passam. Se algum falhar, identificar o seletor quebrado e ajustar o teste (NÃO reverter a mudança de UI).

- [ ] **Step 3: Teste manual — checklist visual**

Rodar `pnpm dev` em local (logado com usuário que tenha ao menos 2 clientes e 1 charge em atraso):

- [ ] `/hoje` mobile (375x812): Hero visível, pills scrollam, BottomNav flutuante não corta
- [ ] `/hoje` desktop (1440x900): SideNav à esquerda, hero horizontal, painel Próximas à direita
- [ ] `/clientes` mobile: avatars carregam, seção "Com pendência" destacada
- [ ] `/cobrancas/[id]` mobile: hero central com valor, StatusBadge correta, ações empilhadas
- [ ] `/relatorios` mobile: Hero com total do mês, lista de meses
- [ ] Clicar nas bottomnav items troca cor do item ativo

- [ ] **Step 4: Conferir se `components/TopBar.tsx` ainda é importado em algum lugar**

Run: `grep -r "TopBar" app/ components/ --include='*.tsx' --include='*.ts'`
Expected: 0 resultados em `app/` (fora do componente em si). Se houver, OK — o componente pode continuar existindo. Se 0 total usos, deletar em commit separado.

- [ ] **Step 5: Conferir contraste de `accent-foreground` sobre `accent`**

Abrir DevTools em `/hoje`, inspecionar um pill ativo, copiar o par (cor do texto, cor do fundo). Checar em https://webaim.org/resources/contrastchecker/ — esperado AA ≥ 4.5:1.

- [ ] **Step 6: Commit final de ajustes (se necessário)**

Se houve ajustes no step 2 (seletores e2e) ou no step 4 (remover TopBar):

```bash
git add -p
git commit -m "chore(design): limpeza pós-refactor e ajustes de e2e"
```

---

## Self-review check (executar antes de considerar pronto)

**Cobertura do spec:**
- [x] §2.1 Paleta — Task 2, 3
- [x] §2.2 Tipografia Inter — Task 1
- [x] §2.3 Espaçamento — aplicado ao longo dos tasks 11–18 (Tailwind default)
- [x] §2.4 Raio — aplicado via classes `rounded-xl`/`rounded-2xl` nos componentes
- [x] §2.5 Elevação — aplicado via classes arbitrárias em BottomNav e FAB (não há FAB no v1 deste plano — ver nota)
- [x] §2.6 Iconografia — lucide já em uso; StatusBadge usa texto só
- [x] §3.1 Botões — reusa shadcn Button que agora herda tokens novos
- [x] §3.2 Pills — Task 7 (FilterPills)
- [x] §3.3 Badges — Task 6 (StatusBadge)
- [x] §3.4 ChargeRow — Task 12
- [x] §3.5 Hero — Task 10 (HeroSummary)
- [x] §3.6 Day strip — NÃO implementar (fora de escopo confirmado no spec)
- [ ] §3.7 FAB — NÃO implementado neste plano. Decisão: por simplicidade, manter o botão "+ Adicionar" / "+ Nova cobrança" no header em todos os breakpoints. Adicionar FAB mobile pode virar task 20 em plano futuro se ficar faltando. Documentar no setup guide.
- [x] §3.8 BottomNav flutuante — Task 11
- [x] §3.9 SideNav com brand+rodapé — Task 11
- [x] §3.10 KPI — Hero cobre; mini-KPI em `/clientes/[id]` fica pro v2
- [ ] §3.11 Master-detail `/clientes` desktop — NÃO implementado neste plano. Fica como Task 20 opcional: na página `/clientes` desktop, quando usuário clica num cliente, ao invés de navegar, atualizar `router.push(/clientes/[id])` e renderizar detalhe num split. Exige `/clientes/[id]/page.tsx` ou Route Groups. Mantido fora por risco/tempo — drill-down atual funciona e o spec aceita isso como degradação aceitável pro v1 de design.
- [x] §3.12 Input — shadcn Input herda tokens
- [x] §3.13 Dialog — shadcn Dialog herda tokens
- [x] §4.1–4.6 Layouts — Tasks 14, 15, 16, 17, 18
- [x] §5 Responsividade — aplicado (layout de 2 colunas em `/hoje`, container widths diferentes)
- [x] §6 Acessibilidade — `aria-selected`, `aria-current`, `aria-hidden` em ícones decorativos
- [x] §7 Escopo — 10 itens cobertos, exceto FAB e master-detail (nota acima)

**Placeholders:** nenhum "TBD", "TODO", "fill in details" — verificado.

**Consistência de tipos:**
- `buildMonthSummary` retorna `MonthSummary` usado em `HeroSummary` via formatBRL — OK
- `initials` retorna string — OK
- `FilterPills<T>` genérico — usado em `HojeFilterPills` com type `Filter` — OK

**Gaps reconhecidos (aceitos como trade-off deste plano):**
- FAB mobile (§3.7) — decisão alternativa: botão no header funciona em todos os breakpoints
- Master-detail desktop `/clientes` (§3.11) — drill-down atual é aceitável

Se quiser fechar esses 2 gaps, posso adicionar Task 20 e 21 antes da entrega. Caso contrário, seguem como débito explícito pro v2.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-20-design-system.md`. Two execution options:**

1. **Subagent-Driven (recommended)** — Eu despacho um subagent fresco por task, reviso entre tasks, iteração rápida. Melhor pro contexto ficar limpo e pra pegar problemas logo.

2. **Inline Execution** — Executo tasks nessa mesma sessão em batches com checkpoints. Mais direto, mas consome mais contexto.

**Qual abordagem?**
