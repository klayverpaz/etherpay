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
