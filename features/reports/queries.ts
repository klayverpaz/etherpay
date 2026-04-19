import { createClient } from "@/lib/supabase/server";
import type { Charge } from "@/features/charges/types";

/**
 * Fetch all paid charges for the caller, across all time.
 * Used by the reports list and monthly breakdown pages.
 */
export async function listAllPaidCharges(): Promise<Charge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("charges")
    .select("*")
    .eq("status", "paid")
    .is("deleted_at", null)
    .order("paid_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Charge[];
}

/**
 * Fetch paid charges whose paid_at falls within [monthStart, nextMonthStart).
 * Dates are "YYYY-MM-DD" strings (inclusive start, exclusive end).
 */
export async function listPaidChargesInMonth(
  monthStartISO: string,
  nextMonthStartISO: string,
): Promise<Charge[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("charges")
    .select("*")
    .eq("status", "paid")
    .gte("paid_at", `${monthStartISO}T00:00:00+00:00`)
    .lt("paid_at", `${nextMonthStartISO}T00:00:00+00:00`)
    .is("deleted_at", null)
    .order("paid_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Charge[];
}

/**
 * Fetch id → name map for the caller's non-deleted clients.
 * Used on the monthly breakdown page to render client names.
 */
export async function mapClientIdsToNames(): Promise<Map<string, string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  const map = new Map<string, string>();
  for (const row of data ?? []) map.set(row.id, row.name);
  return map;
}
