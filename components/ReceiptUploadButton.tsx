"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { newId } from "@/lib/uuid";
import { compressImageIfNeeded } from "@/features/charges/services/compressImage";
import { attachReceiptAction } from "@/features/charges/actions";

type Props = {
  chargeId: string;
  ownerId: string;
};

function extensionFromMime(mime: string, fallback: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "application/pdf") return "pdf";
  return fallback || "bin";
}

export function ReceiptUploadButton({ chargeId, ownerId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [, startTransition] = useTransition();

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const processed = await compressImageIfNeeded(file);
      const attachmentId = newId();
      const originalExt = (file.name.split(".").pop() ?? "").toLowerCase();
      const ext = extensionFromMime(processed.type, originalExt);
      const storagePath = `${ownerId}/${chargeId}/${attachmentId}.${ext}`;

      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from("attachments")
        .upload(storagePath, processed, {
          contentType: processed.type,
          upsert: false,
        });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }

      startTransition(async () => {
        const result = await attachReceiptAction({
          charge_id: chargeId,
          attachment_id: attachmentId,
          storage_path: storagePath,
          mime_type: processed.type,
          size_bytes: processed.size,
          original_name: file.name,
        });
        if (result?.error) toast.error(result.error);
        else toast.success("Anexo enviado.");
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={onChange}
      />
      <Button
        type="button"
        variant="outline"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Enviando..." : "Anexar comprovante"}
      </Button>
    </>
  );
}
