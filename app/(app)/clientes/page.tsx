import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ClientRow } from "@/components/ClientRow";
import { EmptyState } from "@/components/EmptyState";
import { listClients } from "@/features/clients/queries";

export default async function ClientesPage() {
  const clients = await listClients();

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Button asChild>
          <Link href="/clientes/novo">Adicionar</Link>
        </Button>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="Nenhum cliente ainda"
          description="Adicione seu primeiro cliente para começar."
          action={
            <Button asChild>
              <Link href="/clientes/novo">Adicionar cliente</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <ClientRow key={c.id} client={c} />
          ))}
        </div>
      )}
    </section>
  );
}
