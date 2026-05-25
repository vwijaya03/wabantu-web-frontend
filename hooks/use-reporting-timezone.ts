"use client";

import { useQuery } from "@tanstack/react-query";
import { businessApi } from "@/lib/api/business";
import { DEFAULT_REPORTING_TIMEZONE_UI } from "@/lib/reporting-timezones";

export function useReportingTimezone() {
  const { data: profile } = useQuery({
    queryKey: ["business-profile"],
    queryFn: businessApi.get,
    staleTime: 30_000,
  });

  return profile?.reportingTimezone ?? DEFAULT_REPORTING_TIMEZONE_UI;
}
