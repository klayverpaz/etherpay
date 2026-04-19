export type CycleKind = "days" | "weeks" | "months";

export interface Client {
  id: string;
  owner_id: string;
  name: string;
  phone_e164: string | null;
  default_amount_cents: number;
  cycle_kind: CycleKind;
  cycle_every: number;
  cycle_anchor_date: string;
  cycle_end_date: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NewClientInput {
  name: string;
  phone_e164: string | null;
  default_amount_cents: number;
  cycle_kind: CycleKind;
  cycle_every: number;
  cycle_anchor_date: string;
  cycle_end_date: string | null;
  notes: string | null;
}
