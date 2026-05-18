"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { INBOX_UNREAD_QUERY_KEY } from "@/lib/api/inbox";
import { env } from "@/lib/env";

function inboxStreamUrl(): string {
  const path = "/inbox/stream";
  const apiV1 = env.apiUrl.replace(/\/$/, "");
  if (env.sseApiUrl) {
    return `${env.sseApiUrl.replace(/\/$/, "")}${path}`;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${apiV1}${path}`;
  }
  return `${apiV1}${path}`;
}

const MAX_SSE_BACKOFF_MS = 30_000;

/**
 * Subscribes to inbox SSE (Redis push when webhook stores an inbound message).
 * Invalidates unread + conversation caches — push + reconnect.
 * Fallback: inbox queries also use `refetchOnWindowFocus: "always"` so UI updates
 * if SSE fails (common when EventSource goes through Next rewrites).
 */
export function useInboxActivityStream(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const url = inboxStreamUrl();
    let cancelled = false;
    let es: EventSource | null = null;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const invalidate = () => {
      void qc.invalidateQueries({ queryKey: INBOX_UNREAD_QUERY_KEY });
      void qc.invalidateQueries({ queryKey: ["inbox-conversations"] });
      void qc.invalidateQueries({ queryKey: ["inbox-messages"] });
    };

    const onMessage = (ev: MessageEvent) => {
      try {
        const p = JSON.parse(String(ev.data)) as { type?: string };
        if (p?.type === "ping") return;
      } catch {
        /* non-JSON still counts as activity */
      }
      invalidate();
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      const delay = Math.min(
        MAX_SSE_BACKOFF_MS,
        1000 * 2 ** Math.min(retryAttempt, 5),
      );
      retryAttempt += 1;
      retryTimer = setTimeout(connect, delay);
    };

    const connect = () => {
      if (cancelled) return;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      es?.close();
      es = new EventSource(url, { withCredentials: true } as EventSourceInit);
      es.addEventListener("message", onMessage);
      es.addEventListener("open", () => {
        retryAttempt = 0;
      });
      es.onerror = () => {
        es?.close();
        es = null;
        scheduleReconnect();
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.removeEventListener("message", onMessage);
      es?.close();
    };
  }, [qc]);
}
