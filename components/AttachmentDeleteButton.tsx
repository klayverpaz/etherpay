"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { deleteAttachmentAction } from "@/features/charges/actions";

export function AttachmentDeleteButton({ attachmentId }: { attachmentId: string }) {
  const [pending, startTransition] = useTransition();

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const result = await deleteAttachmentAction(attachmentId);
      if (result?.error) toast.error(result.error);
      else toast.success("Anexo removido.");
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="absolute right-1 top-1 rounded bg-background/80 px-1.5 py-0.5 text-xs text-destructive hover:bg-background"
      aria-label="Remover anexo"
    >
      ✕
    </button>
  );
}
