"use client";

import { useInboxActivityStream } from "@/hooks/use-inbox-activity-stream";
import { useInboxRealtimeRefresh } from "@/hooks/use-inbox-realtime-refresh";
import { InboxSSEStatusBanner } from "@/components/dashboard/inbox-sse-status-banner";

/** Mount once under the dashboard shell to receive inbox SSE while browsing any /dashboard route. */
export function InboxActivityBridge() {
  useInboxActivityStream();
  useInboxRealtimeRefresh();
  return <InboxSSEStatusBanner />;
}
