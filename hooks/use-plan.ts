"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { billingApi } from "@/lib/api/billing";
import { hasTenantDashboardAccess } from "@/lib/api/auth";
import { tenantContextKey } from "@/lib/auth/tenant-context";

/** Paid plans that include Business-tier features (not trial). */
function isPaidBusinessTier(planCode: string) {
  return planCode === "business" || planCode === "basic";
}

/** Paid plans that include Pro-tier features (not trial). */
function isPaidProTier(planCode: string) {
  return planCode === "pro";
}

export function usePlan() {
  const { user } = useAuth();
  const tenantReady = hasTenantDashboardAccess(user);

  const { data, isLoading } = useQuery({
    queryKey: ["billing-overview", tenantContextKey(user)],
    queryFn: () => billingApi.overview(),
    staleTime: 60_000,
    enabled: tenantReady,
  });

  const subscription = data?.subscription;
  const isTrial = subscription?.isTrial ?? false;
  const planCode = subscription?.planCode ?? "starter";

  // Trial: every surface is open in UI/API; usage service enforces tight monthly caps.
  const hasAllTrialFeatures = isTrial;

  const limits = isTrial
    ? undefined
    : data?.plans?.find((p) => p.code === planCode)?.limits;

  return {
    isLoading: tenantReady && isLoading,
    isTrial,
    planCode: isTrial ? ("trial" as const) : planCode,
    subscription,
    limits,
    hasBroadcast:
      tenantReady &&
      (hasAllTrialFeatures || isPaidBusinessTier(planCode) || isPaidProTier(planCode)),
    hasWorkflow:
      tenantReady &&
      (hasAllTrialFeatures || isPaidBusinessTier(planCode) || isPaidProTier(planCode)),
    hasMultiBranch: tenantReady && (hasAllTrialFeatures || isPaidProTier(planCode)),
    hasCRMLeads:
      tenantReady &&
      (hasAllTrialFeatures || isPaidBusinessTier(planCode) || isPaidProTier(planCode)),
  };
}
