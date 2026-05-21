import type { QueryClient } from "@tanstack/react-query";
import { INBOX_UNREAD_QUERY_KEY } from "@/lib/api/inbox";

function isInboxQueryKey(key: readonly unknown[], tenantKey?: string): boolean {
  const root = key[0];
  if (root === INBOX_UNREAD_QUERY_KEY[0]) {
    return tenantKey ? key[1] === tenantKey : true;
  }
  if (root === "inbox-conversations" || root === "inbox-messages") {
    return tenantKey ? key[1] === tenantKey : true;
  }
  return false;
}

/** Force refetch active inbox queries (SSE push). Prefer over invalidate with staleTime: Infinity. */
export function refreshInboxQueries(
  qc: QueryClient,
  tenantKey?: string,
): Promise<void> {
  return qc
    .refetchQueries({
      predicate: (q) => isInboxQueryKey(q.queryKey, tenantKey),
      type: "active",
    })
    .then(() => undefined);
}
