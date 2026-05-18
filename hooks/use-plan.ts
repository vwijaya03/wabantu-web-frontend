"use client";

import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/lib/api/billing";

export function usePlan() {
  const { data, isLoading } = useQuery({
    queryKey: ["billing-overview"],
    queryFn: () => billingApi.overview(),
    staleTime: 60_000,
  });
  const planCode = data?.subscription?.planCode ?? "starter";
  const limits = data?.plans?.find((p) => p.code === planCode)?.limits;
  return {
    isLoading,
    planCode,
    subscription: data?.subscription,
    limits,
    hasBroadcast: planCode === "basic" || planCode === "pro" || planCode === "business",
    hasWorkflow: planCode === "basic" || planCode === "pro" || planCode === "business",
    hasMultiBranch: planCode === "pro",
  };
}
