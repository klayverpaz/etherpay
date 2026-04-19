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
