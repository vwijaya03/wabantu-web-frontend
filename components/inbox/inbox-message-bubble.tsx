"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FileText, MapPin, Mic, Video } from "lucide-react";
import { inboxApi, type InboxMessage } from "@/lib/api/inbox";
import { cn } from "@/lib/utils";

function InboxMessageImage({ messageId, alt, className }: { messageId: string; alt?: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setFailed(false);
    setSrc(null);

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
  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob URL from authenticated API
    <img src={src} alt={alt || "Gambar WhatsApp"} className={cn("max-h-64 rounded-md object-contain", className)} />
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
  const body = message.body?.trim() ?? "";
  const nonText = NON_TEXT_LABELS[message.type];

  let content: ReactNode;
  if (message.type === "image" && message.media?.url) {
    content = (
      <div className="space-y-2">
        <InboxMessageImage messageId={message.id} alt={body || undefined} />
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

  return (
    <div
      className={cn(
        "max-w-[85%] rounded-lg border px-3 py-2 text-sm",
        isOut ? "ml-auto bg-primary/10" : "bg-background text-foreground",
      )}
    >
      {content}
      <p className="mt-1 text-[10px] text-muted-foreground">
        {message.author} · {new Date(message.createdAt).toLocaleTimeString("id-ID")}
      </p>
    </div>
  );
}
