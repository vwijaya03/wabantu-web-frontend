"use client";

import { useQuery } from "@tanstack/react-query";
import { businessApi } from "@/lib/api/business";
import { DEFAULT_REPORTING_TIMEZONE_UI } from "@/lib/reporting-timezones";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";

export function useReportingTimezone() {
  const tenantKey = useTenantKey();
  const { data: profile } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "business-profile"),
    queryFn: ({ signal }) => businessApi.get(signal),
    staleTime: 30_000,
  });

  return profile?.reportingTimezone ?? DEFAULT_REPORTING_TIMEZONE_UI;
}
