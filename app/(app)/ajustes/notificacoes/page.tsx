import Link from "next/link";
import { redirect } from "next/navigation";
import { ReminderSettingsForm } from "@/components/ReminderSettingsForm";
import { getSettings } from "@/features/settings/queries";

export const dynamic = "force-dynamic";

export default async function NotificacoesPage() {
  const settings = await getSettings();
  if (!settings) redirect("/ajustes");

  return (
    <section className="mx-auto max-w-2xl space-y-4">
      <div className="space-y-1">
        <Link href="/ajustes" className="text-sm text-muted-foreground hover:underline">
          ← Ajustes
        </Link>
        <h1 className="text-2xl font-semibold">Lembrete diário por e-mail</h1>
        <p className="text-sm text-muted-foreground">
          O envio automático é ativado no próximo release (Plano 4).
        </p>
      </div>

      <ReminderSettingsForm
        initialEnabled={settings.email_reminders_enabled}
        initialTime={settings.daily_reminder_time}
        initialNotifyOnlyIfAny={settings.notify_only_if_any}
      />
    </section>
  );
}
