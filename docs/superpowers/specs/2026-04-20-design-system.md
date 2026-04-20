# DojoPay — Design System (v1)

**Status:** aprovado, pronto pra virar plano de implementação
**Data:** 2026-04-20
**Contexto:** v1 do DojoPay está em produção com tema shadcn default (slate/light) e Arial. Este documento define o sistema visual próprio do produto, alinhado à estética que o usuário escolheu (inspirado em app de habit tracker dark + acento verde, porém adaptado para light theme).

---

## 1. Decisões-guia

| Decisão | Escolha | Motivo |
|---|---|---|
| Tema | **Light-only** | Apps financeiros em light são o padrão que professores esperam; reduz complexidade de manutenção; inverte a referência mas mantém a estrutura. |
| Cor de acento | **Verde esmeralda** (`#10b981`) | Significado nativo de "entrada de dinheiro" + continuidade com a referência. |
| Tipografia | **Inter** | Padrão web, legibilidade excelente em mobile, tabular-nums maduro — zero surpresa. |
| Público-alvo primário | **Celular do professor** | Mobile-first; desktop é adaptação responsiva. |
| Navegação de datas em `/hoje` | **Não** — ancorada no dia atual | Professor recebe em datas fixas (5 e 15); navegação arbitrária agrega complexidade sem valor. |
| Hero de `/hoje` | **Mensal, 3 métricas** (A receber no mês · Em atraso · Recebido) | "A receber hoje" fica na lista abaixo; o hero dá o horizonte financeiro do mês. |

---

## 2. Tokens

### 2.1 Paleta

**Brand**
| Token | Hex | Uso |
|---|---|---|
| `accent-soft` | `#d1fae5` | Fundo de pill ativa, badge "pago", avatar |
| `accent` | `#10b981` | FAB, botão primário, bordas selecionadas, barras de gráfico fortes |
| `accent-text` | `#065f46` | Texto sobre `accent-soft` |

**Superfícies**
| Token | Hex | Uso |
|---|---|---|
| `bg` | `#f8fafc` | Fundo da página |
| `surface` | `#ffffff` | Cards, panels, inputs |
| `surface-muted` | `#f3f4f6` | Pills inativas, botão secundário, hover sutil |
| `border` | `#e5e7eb` | Bordas de cards, inputs, divisores |

**Texto**
| Token | Hex | Uso |
|---|---|---|
| `fg` | `#0a0a0a` | Texto principal |
| `fg-muted` | `#6b7280` | Labels, metadados, sub-texto |
| `fg-placeholder` | `#9ca3af` | Placeholder de inputs, valor zerado desenfatizado |

**Semânticos**
| Token | Hex | Uso |
|---|---|---|
| `danger-soft` | `#fee2e2` | Fundo badge "em atraso" |
| `danger` | `#dc2626` | Borda esquerda de card em atraso, alertas críticos |
| `danger-text` | `#991b1b` | Texto em badge/métrica de atraso |
| `warning-soft` | `#fef3c7` | Fundo badge "vence hoje" |
| `warning-text` | `#92400e` | Texto em badge "vence hoje" |

Mapa para CSS vars (formato HSL, compatível com `tailwind.config.ts` existente):

```css
--background: 210 40% 98%;         /* slate-50 */
--foreground: 0 0% 4%;             /* neutral-950 */
--card: 0 0% 100%;
--card-foreground: 0 0% 4%;
--primary: 160 84% 39%;            /* emerald-500 — nosso "accent" de marca */
--primary-foreground: 0 0% 100%;
--secondary: 220 14% 96%;          /* gray-100 */
--secondary-foreground: 222 47% 11%;
--muted: 220 14% 96%;
--muted-foreground: 220 9% 46%;    /* gray-500 */
--accent: 152 76% 89%;             /* emerald-100 — nosso "accent-soft" */
--accent-foreground: 164 86% 16%;  /* emerald-800 — nosso "accent-text" */
--destructive: 0 72% 51%;          /* red-600 */
--destructive-foreground: 0 0% 100%;
--border: 220 13% 91%;             /* gray-200 */
--input: 220 13% 91%;
--ring: 160 84% 39%;               /* emerald-500 */
```

> **Nota de nomenclatura:** shadcn usa `--primary` para a cor de marca e `--accent` para a variante suave. Neste doc chamo de "accent"/"accent-soft" porque é mais descritivo pro contexto, mas no código os CSS vars seguem a convenção shadcn. Para cores sem equivalente direto em shadcn (`warning-*`, `danger-soft`, `danger-text`), adicionar novas keys em `tailwind.config.ts`.

### 2.2 Tipografia — Inter

Importada via `next/font/google` (substitui Arial no `app/layout.tsx`).

| Nome | Size | Weight | Extras | Uso |
|---|---|---|---|---|
| `display` | 36 | 700 | `-0.02em` | Hero desktop, valores hero mobile |
| `h1` | 28 | 700 | `-0.01em` | Título de página |
| `h2` | 20 | 600 | — | Subtítulo de seção destacada |
| `title` | 17 | 600 | — | Título de card (detalhe) |
| `body` | 15 | 400 | — | Texto corrido, nome em lista |
| `body-sm` | 14 | 400 | — | Botões, labels de form |
| `caption` | 12 | 500 | muted | Meta, data, telefone |
| `label` | 11 | 600 | uppercase, `0.08em` | Labels de seção/KPI |

**Números (valores em R$, datas):** sempre `font-variant-numeric: tabular-nums` em qualquer container que mostre valor monetário ou data numérica — alinhamento vertical em listas é inegociável.

### 2.3 Espaçamento (base 4)

Seguir Tailwind default: `1`/`2`/`3`/`4`/`5`/`6`/`8`/`12` (= 4/8/12/16/20/24/32/48px).

- Padding interno de card: `16-20px`
- Gap entre cards de uma lista: `8-10px`
- Gap entre seções de uma página: `24-32px`
- Padding lateral de container mobile: `16px`
- Padding lateral de container desktop: `28px`

### 2.4 Raio de borda

| Token | Valor | Uso |
|---|---|---|
| `radius-input` | `8px` | Inputs, botões pequenos, segmentos |
| `radius-card` | `12px` | Cards de charge/cliente, panels |
| `radius-lg` | `16-20px` | Hero, containers destacados |
| `radius-fab` | `14-18px` | FAB (16 mobile, 18 desktop) |
| `radius-full` | `9999px` | Pills, avatars, badges |

### 2.5 Elevação

| Nível | Sombra | Uso |
|---|---|---|
| `e0` | `none` + `border` | Padrão (cards flat) |
| `e1` | `0 1px 2px rgb(0 0 0 / 0.05)` | Hover em card clicável |
| `e2` | `0 6px 20px rgb(0 0 0 / 0.08)` | Dropdown, popover, dialog, bottom-nav flutuante |
| `e3` | `0 10px 24px rgb(16 185 129 / 0.4)` | FAB e botão primário de grande destaque (tintado com acento) |

### 2.6 Iconografia

- Biblioteca: **lucide-react** (já em `package.json`, versão `^1.x`)
- Tamanhos: `20px` default (ações/nav), `16px` inline (dentro de texto), `24px` destaque
- Cor: sempre `currentColor` (herda do container)
- Stroke: `1.5px`

---

## 3. Componentes

### 3.1 Botão

Variantes:
- **`primary`** — fundo `accent`, texto branco, `radius-input`, sombra `e3` quando em destaque. Ação principal da tela (ex: "Nova cobrança", "Marcar como pago").
- **`secondary`** — fundo `surface-muted`, texto `fg`. Ações neutras (ex: "Cancelar").
- **`ghost`** — borda `border`, fundo `surface`, texto `fg`. Ações secundárias em contexto denso.
- **`danger`** — fundo `danger`, texto branco. Ações destrutivas irreversíveis (ex: "Apagar dados").
- **`link`** — sem fundo, texto `accent-text`, weight 600. Dentro de texto/subtexto.
- **`icon`** — 40×40px, fundo `surface-muted`, ícone `20px`. No header de tela ou ações inline.

Tamanhos: `sm` (8px 12px), `md` (10px 16px, default), `lg` (14px 20px).

### 3.2 Pill de filtro

- Scroll horizontal em mobile (margem negativa nos lados pra estender à borda)
- Uma ativa por vez (inativas = `surface` com borda; ativa = `accent-soft` sem borda)
- Pode receber contador embutido (ex: "Pendentes **4**") com fundo `rgba(0,0,0,0.06)` (ou `rgba(accent-text, 0.15)` quando ativa)

### 3.3 Badge de status

Inline (dentro de título do charge) ou bloco (no detalhe). Sempre pill completo com ponto colorido opcional.

| Status | Classe | Fundo | Texto |
|---|---|---|---|
| Pendente | `badge-pending` | `surface-muted` | `#374151` |
| Vence hoje | `badge-today` | `warning-soft` | `warning-text` |
| Em atraso | `badge-overdue` | `danger-soft` | `danger-text` |
| Pago | `badge-paid` | `accent-soft` | `accent-text` |

Badges de atraso incluem dias na label: `Em atraso · 3 dias` ou só `3 dias` quando compacto.

### 3.4 Card de cobrança (ChargeRow)

Estrutura horizontal:
```
[avatar 40px]  [nome + badge]          [valor]  [actions?]
               [meta: ciclo · método · venc]
```

- Avatar = iniciais do cliente, fundo `accent-soft`, texto `accent-text`
- Nome em `body`/600, badge inline à direita do nome
- Meta em `caption`/muted com `tabular-nums`
- Valor em `body`/700 com `tabular-nums`, alinhado à direita
- **Borda esquerda vermelha 3px quando `overdue`**
- Actions inline (ícones 32×32 em `surface-muted`) aparecem em desktop/hover; no mobile são acessadas via menu `⋯` (já existe `ChargeRowActions` dropdown)

### 3.5 Hero de `/hoje`

Gradiente sutil: `linear-gradient(145deg, #fff 0%, #f0fdf4 100%)` + círculo radial tintado de verde no canto superior direito (camada decorativa).

Conteúdo:
```
A RECEBER NO MÊS
R$ 8.640                 <- display (36px/700)
32 cobranças · abril     <- body/muted
─────────────────────────
EM ATRASO          RECEBIDO
R$ 640 · 2         R$ 1.560 · 6
(label-sm + title/tabular)
```

### 3.6 Day strip (documentado — NÃO implementar agora)

Componente **não faz parte do escopo v1 deste design system**. Foi explorado durante o brainstorm e descartado (decisão: `/hoje` é ancorada no dia atual, sem navegação de datas). Spec ficará aqui pra referência caso no futuro surja uma tela tipo "agenda da semana":

Chip 48-52px com weekday + número + ponto indicador; selecionado = fundo `accent` com sombra `e3`; hoje = borda preta 1.5px.

### 3.7 FAB

- Mobile: fixo bottom-right, `56×56px`, `radius-fab`, `accent` + sombra `e3` tintada. Ícone `+` em 24px/300. Z-index acima da bottom-nav.
- Desktop: **não aparece** — substituído por botão `primary` no header da tela.

Ação é contextual: `/hoje` → "Nova cobrança", `/clientes` → "Novo cliente".

### 3.8 Bottom nav (mobile, `< lg`)

Flutuante, `position: fixed`, `bottom: 14px; left: 14px; right: 14px`. Fundo `surface`, borda `border`, `radius-lg`, sombra `e2`. 4 itens distribuídos flex-1.

Ativo: fundo `accent-soft`, texto `accent-text`, weight 600, ícone preenchido. Inativo: texto `fg-muted`.

Itens: Hoje · Clientes · Relatórios · Ajustes (mesmos do SideNav).

### 3.9 Side nav (desktop, `≥ lg`)

220px fixo à esquerda. Fundo `surface`, borda direita `border`.

Estrutura:
1. **Brand** — quadrado 32×32 com "DP" em fundo `accent` + nome "DojoPay"
2. **Itens** — `flex gap-10`, padding 9px 12px, `radius-input`. Ativo = `accent-soft`/`accent-text`/600.
3. **Rodapé** — avatar 32px + nome do usuário + sub "Plano grátis"

### 3.10 Summary card / KPI

- **Formato grande** (hero): label uppercase + valor `display` + sub + divisor + 2 métricas secundárias
- **Formato mini** (grid 2×2 em `/relatorios`, ou 3-col em `/clientes/[id]`): label `label` + valor `h2`/700 + delta opcional

### 3.11 Master-detail (desktop, `/clientes`)

Grid `340px 1fr`. Lista com busca no topo + rows compactas (avatar 36px + nome + plano + badge de status à direita). Row selecionada = fundo `accent-soft` + avatar em `accent` sólido. Detalhe à direita = header grande + KPIs + histórico. No mobile colapsa para drill-down (tela inteira por cliente — padrão atual).

### 3.12 Input

- `radius-input`, padding `12px 14px`, borda `border`, fundo `surface`
- Foco: borda `accent` + `ring` 3px translúcido (`rgba(16,185,129,0.15)`)
- Label externa (em cima, fora do input) em `caption`/600/muted

### 3.13 Dialog / Modal

Fundo overlay `rgba(0,0,0,0.5)`, container central `radius-lg` + sombra `e2`, padding 24px. Títulos `h2`, body `body`, ações no rodapé alinhadas à direita (mobile: full-width stacked).

---

## 4. Layout de telas

### 4.1 `/hoje` (mobile)

```
[statusbar]
Hoje                            [🔍]
seg, 20 de abril

┌─ HERO mensal ─────────────────┐
│ A receber no mês              │
│ R$ 8.640                      │
│ 32 cobranças · abril          │
│ ─────                         │
│ Em atraso       Recebido      │
│ R$ 640 · 2      R$ 1.560 · 6  │
└───────────────────────────────┘

[Todas 7] [Pendentes 4] [Atraso 2] [Pagas 1]  ← pills

EM ATRASO · 2
┌────────────────────────────┐
│ [MC] Marina Costa [3 dias] │
│      Mensal · Pix   R$ 320 │ ← borda esq vermelha
└────────────────────────────┘
(+ Pedro Souza)

HOJE · 3
(+ João, Ana, Lucas [Pago])

                           [+] FAB
[Hoje][Clientes][Relatórios][Ajustes] ← bottom nav flutuante
```

### 4.2 `/hoje` (desktop)

- SideNav 220px à esquerda
- Header: título + subtítulo + [Buscar] [+ Nova cobrança]
- Hero horizontal em 3 colunas (`1.3fr 1fr 1fr`)
- Abaixo: grid `1fr 340px` — listas à esquerda, painel "Próximas cobranças" à direita

### 4.3 `/clientes` (mobile)

Lista simples (pills de filtro no topo) com cards de cliente (avatar + nome + plano + status à direita). Tap abre drill-down `/clientes/[id]`.

### 4.4 `/clientes` (desktop)

Master-detail. Selecionar cliente atualiza rota `/clientes/[id]`. Histórico de cobranças empilhado no detalhe.

### 4.5 `/cobrancas/[id]`

Hero central: valor grande + badge de status. Abaixo, detail rows (vencimento · ciclo · método · recibos). Ações empilhadas: `primary` (marcar pago) + `ghost` (whatsapp, anexar recibo).

### 4.6 `/relatorios`

- Pills de mês (navegação entre meses é **permitida** aqui — diferente de `/hoje`)
- KPI grid 2×2 (Recebido · Pendente · Ticket médio · Ativos) com delta vs mês anterior
- Chart "Recebido por semana" (barras, barra mais alta destacada em `accent` sólido)
- Chart "Por método de pagamento" (barra segmentada horizontal + legenda)

---

## 5. Responsividade

| Breakpoint | Tailwind | Comportamento |
|---|---|---|
| `< 640px` | default | Mobile: bottom-nav flutuante, FAB, hero vertical, listas em coluna única |
| `640-1024px` | `sm:` / `md:` | Mobile expandido: padding lateral maior, hero pode ficar em 2 colunas |
| `≥ 1024px` | `lg:` | Desktop: SideNav aparece, bottom-nav some, FAB vira botão header, hero horizontal 3 colunas, master-detail em `/clientes` |

---

## 6. Acessibilidade

- Contraste AA mínimo em todos os pares texto/fundo (verificar `accent-text` sobre `accent-soft` = passa; `fg-muted` sobre `bg` = passa)
- Foco visível em todos os interativos (ring `accent` 3px translúcido)
- Área de toque mínima 44×44px em mobile
- Badges com cor também têm forma/ícone distinto (ex: ✓ pago, ⚠ atraso) pra não depender só de cor

---

## 7. Escopo de implementação (v1 deste design system)

### Entregável
1. **Atualizar `app/globals.css`** — substituir CSS vars pelos HSL definidos na §2.1
2. **Adicionar Inter via `next/font/google`** em `app/layout.tsx`, remover Arial de body
3. **Atualizar `tailwind.config.ts`** — adicionar novas keys que shadcn não tem: `warning` / `warning-soft` / `warning-text`, `danger-soft` / `danger-text` (não redefinir `destructive`, que já existe). `accent-text` equivale ao shadcn `accent-foreground`.
4. **Refatorar `components/Nav.tsx`** — SideNav com brand + rodapé; BottomNav flutuante com fundo `accent-soft` na ativa
5. **Novo componente `Hero`** reutilizável em `/hoje` (props: label, value, sub, secondary metrics)
6. **Refatorar `components/ChargeRow.tsx`** — avatar iniciais + badge + borda esquerda vermelha em overdue + actions inline (desktop)
7. **Novo componente `FilterPills`** — array de opções + contadores
8. **Novo componente `StatusBadge`** — variantes (pending/today/overdue/paid)
9. **Refatorar páginas**: `/hoje`, `/clientes` (mobile + master-detail desktop), `/cobrancas/[id]`, `/relatorios`
10. **Painel "Próximas cobranças"** no `/hoje` desktop (query de próximos 7 dias)

### Fora de escopo (v2+)
- Dark mode
- Day strip / navegação de datas em `/hoje`
- Animações avançadas (micro-interações nos pills, charges sendo marcadas como pagas)
- Charts mais sofisticados em `/relatorios` (hoje são bars/segment simples — basta mesmo)

---

## 8. Referências

- App inspirador: screenshots do habit tracker dark com acento verde mint (mantidos em `.superpowers/brainstorm/17650-1776690651/content/` — referência visual, não copiar diretamente)
- Spec original do produto: `docs/superpowers/specs/2026-04-19-dojopay-design.md`
- Setup atual: `docs/setup-guide.md`
- Estado da stack: `memory/dojopay_stack_state.md`
