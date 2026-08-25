import type { QueryClient } from "@tanstack/react-query";

/** Query keys that must not run on platform admin console (no tenant context). */
const PLATFORM_SAFE_QUERY_ROOTS = new Set(["admin-tenants"]);

export function isTenantScopedQuery(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  if (typeof root !== "string") return true;
  return !PLATFORM_SAFE_QUERY_ROOTS.has(root);
}

/**
 * Drop cached tenant queries when the active tenant changes (impersonation switch,
 * stop pantau, or normal tenant context change). Prevents inbox/catalog/etc. from
 * showing the previous tenant until a full page reload.
 */
export function resetTenantScopedQueries(qc: QueryClient): void {
  qc.cancelQueries({
    predicate: (q) => isTenantScopedQuery(q.queryKey),
  });
  qc.removeQueries({
    predicate: (q) => isTenantScopedQuery(q.queryKey),
  });
}

/**
 * After leaving impersonation, drop cached tenant queries so nothing refetches
 * inbox/catalog/etc. with an empty tenant schema (avoids 500s + rate-limit storms).
 */
export function resetQueriesForPlatformConsole(qc: QueryClient): void {
  resetTenantScopedQueries(qc);
}
