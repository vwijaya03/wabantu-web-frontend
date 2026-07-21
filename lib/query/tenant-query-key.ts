/**
 * Build a tenant-scoped React Query key.
 * Pattern matches inbox/events: [domain, tenantKey, ...filters].
 */
export function tenantQueryKey(
  tenantKey: string,
  domain: string,
  ...rest: unknown[]
): readonly unknown[] {
  return [domain, tenantKey, ...rest];
}

/** Invalidate tenant-scoped queries for a domain (prefix match). */
export function invalidateTenantQueries(
  qc: { invalidateQueries: (opts: { queryKey: readonly unknown[] }) => Promise<void> | void },
  tenantKey: string,
  domain: string,
  ...rest: unknown[]
): void {
  void qc.invalidateQueries({ queryKey: [domain, tenantKey, ...rest] });
}
