"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabase } from "@/lib/supabase/server";
import { newId } from "@/lib/uuid";
import { formatISODate } from "@/lib/date";
import { nextNDueDates } from "./services/cycle";
import type { CycleKind } from "@/features/clients/types";

const ROLLING_WINDOW_TARGET = 3;

type ClientForTopUp = {
  id: string;
  owner_id: string;
  default_amount_cents: number;
  cycle_kind: CycleKind;
  cycle_every: number;
  cycle_anchor_date: string;
  cycle_end_date: string | null;
};

function getTodayISO(): string {
  return formatISODate(new Date());
}

/**
 * Ensure the client has at least ROLLING_WINDOW_TARGET pending charges with
 * due_date >= today. Idempotent: safe to call multiple times.
 * Returns the number of charges inserted.
 */
export async function topUpClientCharges(clientId: string): Promise<number> {
  const supabase = createSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: clientRow, error: clientErr } = await supabase
    .from("clients")
    .select(
      "id, owner_id, default_amount_cents, cycle_kind, cycle_every, cycle_anchor_date, cycle_end_date, archived_at, deleted_at",
    )
    .eq("id", clientId)
    .maybeSingle();
  if (clientErr) throw new Error(clientErr.message);
  if (!clientRow) return 0;
  if (clientRow.archived_at || clientRow.deleted_at) return 0;

  const client: ClientForTopUp = {
    id: clientRow.id,
    owner_id: clientRow.owner_id,
    default_amount_cents: clientRow.default_amount_cents,
    cycle_kind: clientRow.cycle_kind,
    cycle_every: clientRow.cycle_every,
    cycle_anchor_date: clientRow.cycle_anchor_date,
    cycle_end_date: clientRow.cycle_end_date,
  };

  const todayISO = getTodayISO();

  const { data: existingRows, error: existingErr } = await supabase
    .from("charges")
    .select("due_date, status")
    .eq("client_id", client.id)
    .is("deleted_at", null);
  if (existingErr) throw new Error(existingErr.message);

  const allExistingDates = (existingRows ?? []).map((r) => r.due_date);
  const pendingUpcomingCount = (existingRows ?? []).filter(
    (r) => r.status === "pending" && r.due_date >= todayISO,
  ).length;

  const needed = Math.max(0, ROLLING_WINDOW_TARGET - pendingUpcomingCount);
  if (needed === 0) return 0;

  const datesToInsert = nextNDueDates({
    anchorDate: client.cycle_anchor_date,
    kind: client.cycle_kind,
    every: client.cycle_every,
    endDate: client.cycle_end_date,
    todayISO,
    excludeDates: allExistingDates,
    n: needed,
  });

  if (datesToInsert.length === 0) return 0;

  const rows = datesToInsert.map((due_date) => ({
    id: newId(),
    owner_id: client.owner_id,
    client_id: client.id,
    due_date,
    amount_cents: client.default_amount_cents,
    status: "pending" as const,
  }));

  const { error: insertErr } = await supabase.from("charges").insert(rows);
  if (insertErr) throw new Error(insertErr.message);

  return rows.length;
}

/**
 * Top up every non-archived client. Called on /hoje render so the window
 * stays fresh even if a prior mutation didn't top up (e.g. archived then
 * un-archived, or an old account first logging in after v2 upgrade).
 */
export async function topUpAllClients(): Promise<number> {
  const supabase = createSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .is("deleted_at", null)
    .is("archived_at", null);
  if (error) throw new Error(error.message);

  let total = 0;
  for (const row of data ?? []) {
    total += await topUpClientCharges(row.id);
  }
  if (total > 0) revalidatePath("/hoje");
  return total;
}
