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
