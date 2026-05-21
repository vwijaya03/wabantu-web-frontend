import type { AuthUser } from "@/lib/api/auth";

/** Stable key for tenant-scoped API context (impersonation or normal tenant). */
export function tenantContextKey(user: AuthUser | null | undefined): string {
  if (!user) return "anonymous";
  if (user.impersonation?.active && user.tenant?.id) {
    return `imp:${user.tenant.id}`;
  }
  if (user.platform) return "platform";
  if (user.tenant?.id) return `tenant:${user.tenant.id}`;
  return `user:${user.id}`;
}
