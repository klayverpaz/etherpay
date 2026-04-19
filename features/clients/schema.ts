import { z } from "zod";

export const cycleKind = z.enum(["days", "weeks", "months"]);

export const clientInputSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  phone_e164: z
    .string()
    .regex(/^\+?[1-9]\d{7,14}$/, "Telefone inválido")
    .nullable()
    .or(z.literal("").transform(() => null)),
  default_amount_cents: z.number().int().nonnegative(),
  cycle_kind: cycleKind,
  cycle_every: z.number().int().min(1).max(366),
  cycle_anchor_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cycle_end_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  notes: z.string().max(2000).nullable(),
});

export type ClientInput = z.infer<typeof clientInputSchema>;
