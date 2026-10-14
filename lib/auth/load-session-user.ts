import { platformAdminMe } from "@/lib/api/admin-client";
import { authApi, type AuthUser } from "@/lib/api/auth";
import { getAdminToken } from "@/lib/auth/admin-session";
import { getImpersonationToken } from "@/lib/auth/impersonation-session";
import { getAccessToken } from "@/lib/auth/session";

/**
 * Sesi mana yang dipakai shell dashboard:
 * - "tenant": token impersonation (Pantau) atau token client → GET /auth/me (klien `api`).
 * - "admin": hanya sesi admin → GET /platform-admin/me (klien `adminApi`), tanpa sesi client.
 * - "none": tidak ada sesi.
 */
export type SessionKind = "tenant" | "admin" | "none";

export function currentSessionKind(): SessionKind {
  if (getImpersonationToken() || getAccessToken()) return "tenant";
  if (getAdminToken()) return "admin";
  return "none";
}

export function isAdminConsolePath(path: string): boolean {
  return path === "/dashboard/admin" || path.startsWith("/dashboard/admin/");
}

export async function loadSessionUser(kind: SessionKind = currentSessionKind()): Promise<AuthUser> {
  if (kind === "tenant") return authApi.me();
  if (kind === "admin") {
    const me = await platformAdminMe();
    return { id: me.id, email: me.email, name: me.name ?? null, role: "super_admin", platform: true };
  }
  throw new Error("no session");
}
