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
