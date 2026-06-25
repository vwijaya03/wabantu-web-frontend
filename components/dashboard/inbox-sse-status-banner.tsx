"use client";

import { useEffect, useState } from "react";
import { INBOX_SSE_STATUS, type InboxSSEStatus } from "@/lib/inbox/realtime-events";

/** Thin banner when inbox SSE is reconnecting. */
export function InboxSSEStatusBanner() {
  const [status, setStatus] = useState<InboxSSEStatus>("connected");

  useEffect(() => {
    const onStatus = (ev: Event) => {
      const detail = (ev as CustomEvent<InboxSSEStatus>).detail;
      if (detail === "connected" || detail === "disconnected") {
        setStatus(detail);
      }
    };
    window.addEventListener(INBOX_SSE_STATUS, onStatus);
    return () => window.removeEventListener(INBOX_SSE_STATUS, onStatus);
  }, []);

  if (status === "connected") return null;

  return (
    <div
      role="status"
      className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950"
    >
      Koneksi realtime inbox terputus — mencoba menyambung ulang…
    </div>
  );
}
