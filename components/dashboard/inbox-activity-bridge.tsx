"use client";

import { useInboxActivityStream } from "@/hooks/use-inbox-activity-stream";

/** Mount once under the dashboard shell to receive inbox SSE while browsing any /dashboard route. */
export function InboxActivityBridge() {
  useInboxActivityStream();
  return null;
}
