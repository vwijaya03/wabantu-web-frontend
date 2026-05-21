import type { QueryClient } from "@tanstack/react-query";

/** Query keys that must not run on platform admin console (no tenant context). */
const PLATFORM_SAFE_QUERY_ROOTS = new Set(["admin-tenants"]);

function isTenantScopedQuery(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  if (typeof root !== "string") return true;
  return !PLATFORM_SAFE_QUERY_ROOTS.has(root);
}

/**
 * After leaving impersonation, drop cached tenant queries so nothing refetches
 * inbox/catalog/etc. with an empty tenant schema (avoids 500s + rate-limit storms).
 */
export function resetQueriesForPlatformConsole(qc: QueryClient): void {
  qc.cancelQueries({
    predicate: (q) => isTenantScopedQuery(q.queryKey),
  });
  qc.removeQueries({
    predicate: (q) => isTenantScopedQuery(q.queryKey),
  });
}
