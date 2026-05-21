"use client";

import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/lib/api/billing";

/** Paid plans that include Business-tier features (not trial). */
function isPaidBusinessTier(planCode: string) {
  return planCode === "business" || planCode === "basic";
}

/** Paid plans that include Pro-tier features (not trial). */
function isPaidProTier(planCode: string) {
  return planCode === "pro";
}

export function usePlan() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-overview"],
    queryFn: () => billingApi.overview(),
    staleTime: 60_000,
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
    isLoading,
    isTrial,
    planCode: isTrial ? ("trial" as const) : planCode,
    subscription,
    limits,
    hasBroadcast:
      hasAllTrialFeatures || isPaidBusinessTier(planCode) || isPaidProTier(planCode),
    hasWorkflow:
      hasAllTrialFeatures || isPaidBusinessTier(planCode) || isPaidProTier(planCode),
    hasMultiBranch: hasAllTrialFeatures || isPaidProTier(planCode),
    hasCRMLeads:
      hasAllTrialFeatures || isPaidBusinessTier(planCode) || isPaidProTier(planCode),
  };
}
