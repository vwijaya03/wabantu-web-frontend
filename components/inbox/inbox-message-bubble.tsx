"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { FileText, MapPin, Mic, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { inboxApi, type InboxMessage } from "@/lib/api/inbox";
import { formatOrderNumber } from "@/lib/format-order-number";
import { cn } from "@/lib/utils";

function InboxMessageImage({ messageId, alt, className }: { messageId: string; alt?: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    void inboxApi
      .fetchMessageMediaBlob(messageId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [messageId]);

  if (failed) {
    return <p className="text-xs text-muted-foreground">Gagal memuat gambar</p>;
  }
  if (!src) {
    return <p className="text-xs text-muted-foreground">Memuat gambar…</p>;
  }
  const imageAlt = alt || "Gambar WhatsApp";

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- blob URL from authenticated API */}
      <img
        src={src}
        alt={imageAlt}
        className={cn("max-h-64 cursor-pointer rounded-md object-contain", className)}
        onClick={() => setLightboxOpen(true)}
      />
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] items-center justify-center border-0 bg-black/90 p-4 shadow-none sm:rounded-none [&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100">
          <DialogTitle className="sr-only">{imageAlt}</DialogTitle>
          <DialogDescription className="sr-only">
            Pratinjau gambar pesan WhatsApp dalam layar penuh
          </DialogDescription>
          {/* eslint-disable-next-line @next/next/no-img-element -- same blob URL as thumbnail */}
          <img src={src} alt={imageAlt} className="max-h-[90dvh] max-w-[90vw] object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}

const NON_TEXT_LABELS: Record<string, { icon: typeof FileText; label: string }> = {
  audio: { icon: Mic, label: "Pesan audio" },
  video: { icon: Video, label: "Video" },
  document: { icon: FileText, label: "Dokumen" },
  location: { icon: MapPin, label: "Lokasi" },
};

export function InboxMessageBubble({ message }: { message: InboxMessage }) {
  const isOut = message.direction === "out";
  const isSystem = message.author === "system" && !isOut;
  const body = message.body?.trim() ?? "";
  const nonText = NON_TEXT_LABELS[message.type];

  let content: ReactNode;
  if (message.type === "image" && message.media?.url) {
    content = (
      <div className="space-y-2">
        <InboxMessageImage key={message.id} messageId={message.id} alt={body || undefined} />
        {body ? <p className="whitespace-pre-wrap">{body}</p> : null}
      </div>
    );
  } else if (message.type === "text") {
    content = <p className="whitespace-pre-wrap">{body || ""}</p>;
  } else if (nonText) {
    const Icon = nonText.icon;
    content = (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{body || nonText.label} — pratinjau media belum didukung</span>
      </div>
    );
  } else {
    content = <p className="whitespace-pre-wrap">{body || "(pesan non-text)"}</p>;
  }

  if (isSystem) {
    return (
      <div className="mx-auto max-w-[90%] rounded-lg border border-dashed bg-muted/50 px-3 py-2 text-center text-xs text-muted-foreground">
        {content}
        <p className="mt-1 text-[10px] opacity-70">
          sistem · {new Date(message.createdAt).toLocaleTimeString("id-ID")}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "max-w-[85%] rounded-lg border px-3 py-2 text-sm",
        isOut ? "ml-auto bg-primary/10" : "bg-background text-foreground",
      )}
    >
      {content}
      {message.linkedOrderId ? (
        <Link
          href={`/dashboard/orders?highlight=${message.linkedOrderId}`}
          className="mt-2 inline-flex rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-primary hover:underline"
        >
          Lihat order terkait ({formatOrderNumber(message.linkedOrderId)})
        </Link>
      ) : null}
      <p className="mt-1 text-[10px] text-muted-foreground">
        {message.author} · {new Date(message.createdAt).toLocaleTimeString("id-ID")}
      </p>
    </div>
  );
}
