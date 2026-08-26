import type { AxiosError } from "axios";
import { toApiError } from "@/lib/api/errors";

/** True when the API rejected a tenant-scoped call without impersonation / tenant context. */
export function isTenantContextApiError(error: unknown): boolean {
  if (!(error instanceof Error) || !("isAxiosError" in error)) {
    return false;
  }
  const axiosErr = error as AxiosError;
  const apiErr = toApiError(axiosErr);
  const msg = (apiErr.message ?? "").toLowerCase();

  if (apiErr.status === 403) {
    return msg.includes("tenant context") || msg.includes("pantau tenant");
  }

  // Legacy responses before backend returns 403 for empty tenant schema.
  if (apiErr.status === 401 && msg.includes("missing auth data")) {
    return true;
  }

  return false;
}

/** True when super_admin opened an event that belongs to another tenant schema. */
export function isCrossTenantEventApiError(error: unknown): boolean {
  const apiErr = toApiError(error);
  if (apiErr.status !== 403) {
    return false;
  }
  const msg = (apiErr.message ?? "").toLowerCase();
  return msg.includes("tenant lain") || msg.includes("pantau tenant");
}
