"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabase } from "@/lib/supabase/server";
import { newId } from "@/lib/uuid";
import { clientInputSchema, type ClientInput } from "./schema";

export async function createClientAction(input: ClientInput) {
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = createSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const id = newId();
  const { error } = await supabase.from("clients").insert({
    id,
    owner_id: user.id,
    ...parsed.data,
  });
  if (error) return { error: error.message };

  revalidatePath("/clientes");
  redirect(`/clientes/${id}`);
}

export async function updateClientAction(id: string, input: ClientInput) {
  const parsed = clientInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join("; ") };
  }

  const supabase = createSupabase();
  const { error } = await supabase.from("clients").update(parsed.data).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
  return { success: true };
}

export async function archiveClientAction(id: string) {
  const supabase = createSupabase();
  const { error } = await supabase
    .from("clients")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/clientes");
  redirect("/clientes");
}
