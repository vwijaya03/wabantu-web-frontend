"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { tenantContextKey } from "@/lib/auth/tenant-context";
import { INBOX_REALTIME_PUSH } from "@/lib/inbox/realtime-events";
import { refreshInboxQueries } from "@/lib/query/inbox-queries";

/**
 * Refetches inbox React Query caches when SSE pushes activity.
 * Mount on inbox page + sidebar so lists/badges update without tab focus.
 */
export function useInboxRealtimeRefresh(): void {
  const qc = useQueryClient();
  const { user } = useAuth();
  const tenantKey = tenantContextKey(user);

  useEffect(() => {
    const onPush = () => {
      void refreshInboxQueries(qc, tenantKey);
    };
    window.addEventListener(INBOX_REALTIME_PUSH, onPush);
    return () => window.removeEventListener(INBOX_REALTIME_PUSH, onPush);
  }, [qc, tenantKey]);
}
