"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fillTemplate } from "@/features/charges/services/template";
import { updateTemplateAction } from "@/features/settings/actions";

export function TemplateEditor({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  const preview = fillTemplate(value, {
    nome: "João",
    valor: "R$ 150,00",
    vencimento: "19/04/2026",
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateTemplateAction({ message_template: value });
      if (result?.error) toast.error(result.error);
      else toast.success("Template salvo.");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="template">Mensagem</Label>
        <Textarea
          id="template"
          rows={6}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Use {"{nome}"}, {"{valor}"} e {"{vencimento}"} como marcadores.
        </p>
      </div>

      <div className="rounded-md border bg-muted/40 p-3 text-sm">
        <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
          Prévia
        </div>
        <p className="whitespace-pre-wrap">{preview}</p>
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}
