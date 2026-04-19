"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { brlToCents, formatBRL } from "@/lib/money";
import { clientInputSchema, type ClientInput } from "@/features/clients/schema";

type Props = {
  defaultValues?: Partial<ClientInput>;
  onSubmit: (values: ClientInput) => Promise<{ error?: string; success?: boolean } | void>;
  submitLabel: string;
};

export function ClientForm({ defaultValues, onSubmit, submitLabel }: Props) {
  const [amountDisplay, setAmountDisplay] = useState(
    defaultValues?.default_amount_cents != null
      ? formatBRL(defaultValues.default_amount_cents)
      : "",
  );

  const form = useForm<ClientInput>({
    resolver: standardSchemaResolver(clientInputSchema),
    defaultValues: {
      name: "",
      phone_e164: null,
      default_amount_cents: 0,
      cycle_kind: "months",
      cycle_every: 1,
      cycle_anchor_date: new Date().toISOString().slice(0, 10),
      cycle_end_date: null,
      notes: null,
      ...defaultValues,
    },
  });

  async function handleSubmit(values: ClientInput) {
    const result = await onSubmit(values);
    if (result && "error" in result && result.error) toast.error(result.error);
    else toast.success("Salvo.");
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" {...form.register("name")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone (WhatsApp)</Label>
        <Input
          id="phone"
          placeholder="+5511987654321"
          {...form.register("phone_e164", {
            setValueAs: (v) => (v === "" ? null : v),
          })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Valor padrão</Label>
        <Input
          id="amount"
          value={amountDisplay}
          onChange={(e) => {
            setAmountDisplay(e.target.value);
            const cents = brlToCents(e.target.value);
            form.setValue("default_amount_cents", cents ?? 0, { shouldValidate: true });
          }}
          placeholder="R$ 150,00"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>A cada</Label>
          <Input type="number" min={1} {...form.register("cycle_every", { valueAsNumber: true })} />
        </div>
        <div className="space-y-2">
          <Label>Período</Label>
          <Select
            defaultValue={form.getValues("cycle_kind")}
            onValueChange={(v) => form.setValue("cycle_kind", v as ClientInput["cycle_kind"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="days">dias</SelectItem>
              <SelectItem value="weeks">semanas</SelectItem>
              <SelectItem value="months">meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="anchor">Primeiro vencimento</Label>
          <Input id="anchor" type="date" {...form.register("cycle_anchor_date")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end">Final (opcional)</Label>
          <Input
            id="end"
            type="date"
            {...form.register("cycle_end_date", {
              setValueAs: (v) => (v === "" ? null : v),
            })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observações</Label>
        <Textarea
          id="notes"
          rows={3}
          {...form.register("notes", { setValueAs: (v) => (v === "" ? null : v) })}
        />
      </div>

      <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
        {submitLabel}
      </Button>
    </form>
  );
}
