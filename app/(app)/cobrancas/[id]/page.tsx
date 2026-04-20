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
