import { HeroSummary } from "@/components/ui/hero-summary";
import { HojeFilterPills } from "@/components/HojeFilterPills";
import { PWAInstallHint } from "@/components/PWAInstallHint";
import { formatBRL } from "@/lib/money";
import { formatISODate } from "@/lib/date";
import {
  listTodayAndOverdueCharges,
  listMonthSummaryCharges,
  listUpcomingCharges,
} from "@/features/charges/queries";
import { UpcomingChargesPanel } from "@/components/UpcomingChargesPanel";
import { classifyToday } from "@/features/charges/services/classify";
import { buildMonthSummary } from "@/features/charges/services/summary";
import { topUpAllClients } from "@/features/charges/actions";
import { getSettings } from "@/features/settings/queries";

export const dynamic = "force-dynamic";

const MONTH_LABELS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export default async function HojePage() {
  await topUpAllClients();

  const now = new Date();
  const todayISO = formatISODate(now);
  const yyyyMm = todayISO.slice(0, 7);
  const monthName = MONTH_LABELS[now.getUTCMonth()];

  const [todayAndOverdue, monthCharges, settings, upcoming] = await Promise.all([
    listTodayAndOverdueCharges(todayISO),
    listMonthSummaryCharges(yyyyMm),
    getSettings(),
    listUpcomingCharges(todayISO, 5),
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
}
