import { getImpersonationToken } from "@/lib/auth/impersonation-session";
import { getAccessToken } from "@/lib/auth/session";

/** Bearer JWT for tenant REST and inbox SSE — Pantau (impersonation) wins over stored client token. */
export function getTenantAccessToken(): string | null {
  return getImpersonationToken() ?? getAccessToken();
}
