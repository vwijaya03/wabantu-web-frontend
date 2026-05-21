"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { tenantContextKey } from "@/lib/auth/tenant-context";
import { AUTH_SESSION_UPDATED } from "@/lib/auth/session-sync";
import { dispatchInboxRealtimePush } from "@/lib/inbox/realtime-events";
import { inboxStreamUrl } from "@/lib/inbox/stream-url";

const MAX_SSE_BACKOFF_MS = 30_000;

/**
 * Subscribes to inbox SSE (Redis push when webhook stores an inbound message).
 * Uses access_token query — EventSource cannot send Authorization headers.
 */
export function useInboxActivityStream(): void {
  const { user } = useAuth();
  const tenantKey = tenantContextKey(user);

  useEffect(() => {
    const url = inboxStreamUrl();
    if (!url) return;

    let cancelled = false;
    let es: EventSource | null = null;
    let retryAttempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const onActivity = () => {
      dispatchInboxRealtimePush();
    };

    const onMessage = (ev: MessageEvent) => {
      try {
        const p = JSON.parse(String(ev.data)) as { type?: string };
        if (p?.type === "ping") return;
      } catch {
        /* non-JSON still counts as activity */
      }
      onActivity();
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
      const nextUrl = inboxStreamUrl();
      if (!nextUrl) return;

      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      es?.close();
      es = new EventSource(nextUrl);
      es.onmessage = onMessage;
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

    const onSessionUpdated = () => {
      if (cancelled) return;
      retryAttempt = 0;
      connect();
    };
    window.addEventListener(AUTH_SESSION_UPDATED, onSessionUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_SESSION_UPDATED, onSessionUpdated);
      if (retryTimer) clearTimeout(retryTimer);
      if (es) es.onmessage = null;
      es?.close();
    };
  }, [tenantKey]);
}
