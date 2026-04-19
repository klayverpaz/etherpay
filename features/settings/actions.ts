"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabase } from "@/lib/supabase/server";
import {
  updateReminderInputSchema,
  updateTemplateInputSchema,
} from "./schema";

export async function updateTemplateAction(input: unknown) {
  const parsed = updateTemplateInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("settings")
    .update({ message_template: parsed.data.message_template })
    .eq("owner_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/ajustes");
  revalidatePath("/ajustes/template");
  return { success: true };
}

export async function updateReminderAction(input: unknown) {
  const parsed = updateReminderInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error } = await supabase
    .from("settings")
    .update({
      email_reminders_enabled: parsed.data.email_reminders_enabled,
      daily_reminder_time: parsed.data.daily_reminder_time,
      notify_only_if_any: parsed.data.notify_only_if_any,
    })
    .eq("owner_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/ajustes");
  revalidatePath("/ajustes/notificacoes");
  return { success: true };
}

/**
 * Hard-deletes all charges (which cascade-deletes attachment rows),
 * all clients, and all storage files under `<user.id>/`. Resets the
 * user's settings row to defaults. Signs out and redirects to /sign-in.
 * Auth account is intentionally preserved.
 */
export async function eraseMyDataAction() {
  const supabase = createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { error: chargesErr } = await supabase
    .from("charges")
    .delete()
    .eq("owner_id", user.id);
  if (chargesErr) return { error: chargesErr.message };

  const { error: clientsErr } = await supabase
    .from("clients")
    .delete()
    .eq("owner_id", user.id);
  if (clientsErr) return { error: clientsErr.message };

  const { data: files } = await supabase.storage.from("attachments").list(user.id, {
    limit: 1000,
  });
  if (files && files.length > 0) {
    const paths = files.map((f) => `${user.id}/${f.name}`);
    await supabase.storage.from("attachments").remove(paths);
  }

  await supabase
    .from("settings")
    .update({
      message_template:
        "Olá {nome}, tudo bem? Passando para lembrar da mensalidade de {valor} com vencimento em {vencimento}. Qualquer dúvida me avise. Obrigado!",
      email_reminders_enabled: true,
      daily_reminder_time: "09:00",
      notify_only_if_any: true,
    })
    .eq("owner_id", user.id);

  await supabase.auth.signOut();

  revalidatePath("/");
  redirect("/sign-in");
}
