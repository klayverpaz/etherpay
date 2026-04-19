import Link from "next/link";

export const dynamic = "force-dynamic";

const rows: { href: string; title: string; description: string }[] = [
  {
    href: "/ajustes/template",
    title: "Mensagem do WhatsApp",
    description: "Edite o texto enviado aos clientes.",
  },
  {
    href: "/ajustes/notificacoes",
    title: "Lembrete diário por e-mail",
    description: "Horário e preferências de envio.",
  },
  {
    href: "/ajustes/conta",
    title: "Conta",
    description: "Sair, apagar meus dados.",
  },
];

export default function AjustesPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-semibold">Ajustes</h1>

      <div className="space-y-2">
        {rows.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="block rounded-md border p-4 hover:bg-muted"
          >
            <div className="font-medium">{r.title}</div>
            <div className="text-xs text-muted-foreground">{r.description}</div>
          </Link>
        ))}
      </div>

      <div className="rounded-md border p-4 text-sm">
        <div className="font-medium">Plano</div>
        <div className="text-muted-foreground">Gratuito</div>
      </div>
    </section>
  );
}
