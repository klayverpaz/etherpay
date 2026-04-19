"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { brlToCents, formatBRL } from "@/lib/money";
import { updateChargeAction } from "@/features/charges/actions";

type Props = {
  chargeId: string;
  initialAmountCents: number;
  initialNotes: string | null;
};

export function ChargeDetailForm({ chargeId, initialAmountCents, initialNotes }: Props) {
  const [amountDisplay, setAmountDisplay] = useState(formatBRL(initialAmountCents));
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const cents = brlToCents(amountDisplay);
    if (cents === null) {
      toast.error("Valor inválido.");
      return;
    }
    startTransition(async () => {
      const result = await updateChargeAction({
        charge_id: chargeId,
        amount_cents: cents,
        notes: notes === "" ? null : notes,
      });
      if (result?.error) toast.error(result.error);
      else toast.success("Cobrança atualizada.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Valor</Label>
        <Input
          id="amount"
          value={amountDisplay}
          onChange={(e) => setAmountDisplay(e.target.value)}
          placeholder="R$ 150,00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Salvar alterações"}
      </Button>
    </form>
  );
}
