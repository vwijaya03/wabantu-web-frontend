"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { useTenantSwitch } from "@/components/providers/tenant-switch-provider";
import { hasTenantDashboardAccess } from "@/lib/api/auth";

/** Gate tenant-scoped React Query calls (super_admin needs impersonation; pause during switch). */
export function useTenantQueryEnabled(): boolean {
  const { user } = useAuth();
  const { isSwitching } = useTenantSwitch();
  return hasTenantDashboardAccess(user) && !isSwitching;
}
