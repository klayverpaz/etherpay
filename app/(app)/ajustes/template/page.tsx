import Link from "next/link";
import { redirect } from "next/navigation";
import { TemplateEditor } from "@/components/TemplateEditor";
import { getSettings } from "@/features/settings/queries";

export const dynamic = "force-dynamic";

export default async function TemplatePage() {
  const settings = await getSettings();
  if (!settings) redirect("/ajustes");

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-1">
        <Link href="/ajustes" className="text-sm text-muted-foreground hover:underline">
          ← Ajustes
        </Link>
        <h1 className="text-2xl font-semibold">Mensagem do WhatsApp</h1>
      </div>

      <TemplateEditor initial={settings.message_template} />
    </section>
  );
}
