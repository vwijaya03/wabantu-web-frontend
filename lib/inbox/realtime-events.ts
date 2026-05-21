/** Fired when inbox SSE receives activity (webhook stored a message, etc.). */
export const INBOX_REALTIME_PUSH = "wabantu:inbox-realtime-push";

export function dispatchInboxRealtimePush(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INBOX_REALTIME_PUSH));
}
