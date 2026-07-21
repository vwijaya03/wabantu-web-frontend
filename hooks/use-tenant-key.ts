"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { tenantContextKey } from "@/lib/auth/tenant-context";

/** Stable tenant key for React Query — impersonation, platform, or normal tenant. */
export function useTenantKey(): string {
  const { user } = useAuth();
  return tenantContextKey(user);
}
