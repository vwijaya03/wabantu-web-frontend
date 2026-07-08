"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { hasTenantDashboardAccess } from "@/lib/api/auth";

/** Gate tenant-scoped React Query calls (super_admin needs impersonation). */
export function useTenantQueryEnabled(): boolean {
  const { user } = useAuth();
  return hasTenantDashboardAccess(user);
}
