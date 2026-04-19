import { notFound } from "next/navigation";
import { ClientForm } from "@/components/ClientForm";
import { getClient } from "@/features/clients/queries";
import { updateClientAction } from "@/features/clients/actions";
import type { ClientInput } from "@/features/clients/schema";

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const client = await getClient(params.id);
  if (!client) notFound();

  const defaults: Partial<ClientInput> = {
    name: client.name,
    phone_e164: client.phone_e164,
    default_amount_cents: client.default_amount_cents,
    cycle_kind: client.cycle_kind,
    cycle_every: client.cycle_every,
    cycle_anchor_date: client.cycle_anchor_date,
    cycle_end_date: client.cycle_end_date,
    notes: client.notes,
  };

  async function submit(values: ClientInput) {
    "use server";
    return updateClientAction(params.id, values);
  }

  return (
    <section className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Editar cliente</h1>
      <ClientForm defaultValues={defaults} onSubmit={submit} submitLabel="Salvar" />
    </section>
  );
}
