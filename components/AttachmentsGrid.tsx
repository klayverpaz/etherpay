import Link from "next/link";
import type { Attachment } from "@/features/charges/types";
import { signedUrlForAttachment } from "@/features/charges/queries";
import { AttachmentDeleteButton } from "@/components/AttachmentDeleteButton";

async function resolveUrl(a: Attachment): Promise<string | null> {
  return signedUrlForAttachment(a.storage_path);
}

export async function AttachmentsGrid({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;

  const entries = await Promise.all(
    attachments.map(async (a) => ({ a, url: await resolveUrl(a) })),
  );

  return (
    <div className="grid grid-cols-3 gap-3">
      {entries.map(({ a, url }) => {
        const isImage = a.mime_type.startsWith("image/");
        return (
          <div key={a.id} className="relative overflow-hidden rounded-md border">
            {url ? (
              isImage ? (
                <Link href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={a.original_name ?? "Anexo"}
                    className="aspect-square w-full object-cover"
                  />
                </Link>
              ) : (
                <Link
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex aspect-square w-full items-center justify-center bg-muted text-xs"
                >
                  PDF
                </Link>
              )
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-muted text-xs text-muted-foreground">
                indisponível
              </div>
            )}
            <AttachmentDeleteButton attachmentId={a.id} />
          </div>
        );
      })}
    </div>
  );
}
