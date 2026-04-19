import Link from "next/link";
import { formatBRL } from "@/lib/money";
import type { Client } from "@/features/clients/types";

const cycleLabel: Record<Client["cycle_kind"], string> = {
  days: "dias",
  weeks: "semanas",
  months: "meses",
};

export function ClientRow({ client }: { client: Client }) {
  return (
    <Link
      href={`/clientes/${client.id}`}
      className="flex items-center justify-between rounded-md border p-3 hover:bg-muted"
    >
      <div>
        <div className="font-medium">{client.name}</div>
        <div className="text-xs text-muted-foreground">
          A cada {client.cycle_every} {cycleLabel[client.cycle_kind]}
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold">{formatBRL(client.default_amount_cents)}</div>
      </div>
    </Link>
  );
}
