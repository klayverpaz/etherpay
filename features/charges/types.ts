import type { CycleKind } from "@/features/clients/types";

export type ChargeStatus = "pending" | "paid" | "canceled";

export type PaymentMethod = "pix" | "cash" | "transfer" | "other";

export interface Charge {
  id: string;
  owner_id: string;
  client_id: string;
  due_date: string; // ISO date "YYYY-MM-DD"
  amount_cents: number;
  status: ChargeStatus;
  paid_at: string | null;
  paid_amount_cents: number | null;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ChargeWithClient extends Charge {
  client: {
    id: string;
    name: string;
    phone_e164: string | null;
  };
}

export interface CycleRule {
  kind: CycleKind;
  every: number;
  anchorDate: string;
  endDate: string | null;
}
