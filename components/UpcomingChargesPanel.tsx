import Link from "next/link";
import { formatBRL } from "@/lib/money";
import type { ChargeWithClient } from "@/features/charges/types";

const MONTHS_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
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
