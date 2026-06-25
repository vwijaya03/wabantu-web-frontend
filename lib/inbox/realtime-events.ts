/** Fired when inbox SSE receives activity (webhook stored a message, etc.). */
export const INBOX_REALTIME_PUSH = "wabantu:inbox-realtime-push";

/** SSE connection status for optional UI banner. */
export const INBOX_SSE_STATUS = "wabantu:inbox-sse-status";

export type InboxSSEStatus = "connected" | "disconnected";

export function dispatchInboxRealtimePush(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INBOX_REALTIME_PUSH));
}

export function dispatchInboxSSEStatus(status: InboxSSEStatus): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<InboxSSEStatus>(INBOX_SSE_STATUS, { detail: status }));
}
