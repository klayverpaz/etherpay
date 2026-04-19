"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateReminderAction } from "@/features/settings/actions";

type Props = {
  initialEnabled: boolean;
  initialTime: string; // "HH:MM" or "HH:MM:SS"
  initialNotifyOnlyIfAny: boolean;
};

function normalizeTime(raw: string): string {
  // Trim seconds for the <input type="time"> value; send "HH:MM:SS" back.
  const m = /^(\d{2}:\d{2})(:\d{2})?$/.exec(raw);
  return m ? (m[1] ?? raw) : raw;
}

export function ReminderSettingsForm({
  initialEnabled,
  initialTime,
  initialNotifyOnlyIfAny,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [time, setTime] = useState(normalizeTime(initialTime));
  const [notifyOnlyIfAny, setNotifyOnlyIfAny] = useState(initialNotifyOnlyIfAny);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateReminderAction({
        email_reminders_enabled: enabled,
        daily_reminder_time: `${time}:00`,
        notify_only_if_any: notifyOnlyIfAny,
      });
      if (result?.error) toast.error(result.error);
      else toast.success("Preferências salvas.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="flex items-center justify-between gap-3 rounded-md border p-3">
        <span className="text-sm">
          Receber lembrete diário por e-mail
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4"
        />
      </label>

      <div className="space-y-2">
        <Label htmlFor="time">Horário (América/São Paulo)</Label>
        <Input
          id="time"
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
      </div>

      <label className="flex items-center justify-between gap-3 rounded-md border p-3">
        <span className="text-sm">
          Só enviar quando houver cobrança vencendo ou em atraso
        </span>
        <input
          type="checkbox"
          checked={notifyOnlyIfAny}
          onChange={(e) => setNotifyOnlyIfAny(e.target.checked)}
          className="h-4 w-4"
        />
      </label>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
