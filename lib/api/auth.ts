import { clearClientSession, setAccessToken } from "@/lib/auth/session";
import { api } from "./client";

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: "owner" | "staff" | "super_admin";
  /** Present when viewing a tenant (normal user or impersonation). */
  tenant?: TenantInfo;
  /** Internal WABantu operator — no customer tenant until impersonating. */
  platform?: boolean;
  impersonation?: {
    active: boolean;
    tenant?: TenantInfo;
  };
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  businessName: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

type AuthSessionPayload = {
  user: AuthUser;
  accessToken: string;
  expiresInSeconds?: number;
};

function persistAccessToken(accessToken: string): void {
  setAccessToken(accessToken);
}

/** True when super_admin can use tenant-scoped dashboard pages. */
export function hasTenantDashboardAccess(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.role !== "super_admin") return true;
  return Boolean(user.tenant?.id || user.impersonation?.active);
}

/** Mirrors api-go `AuthUser.CanPerformOwnerActions` (owner, or super_admin while impersonating). */
export function canPerformOwnerActions(user: AuthUser | null): boolean {
  if (!user || !hasTenantDashboardAccess(user)) return false;
  if (user.role === "owner") return true;
  if (user.role === "super_admin") return Boolean(user.impersonation?.active);
  return false;
}

/** True for internal platform home (no tenant selected). */
export function isPlatformOperatorHome(user: AuthUser | null): boolean {
  return user?.role === "super_admin" && Boolean(user.platform) && !hasTenantDashboardAccess(user);
}

export const authApi = {
  async register(p: RegisterPayload): Promise<AuthUser> {
    const res = await api.post<AuthSessionPayload>("/auth/register", p);
    persistAccessToken(res.data.accessToken);
    return res.data.user;
  },
  async login(p: LoginPayload): Promise<AuthUser> {
    const res = await api.post<AuthSessionPayload>("/auth/login", p);
    persistAccessToken(res.data.accessToken);
    return res.data.user;
  },
  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } finally {
      clearClientSession();
    }
  },
  async me(): Promise<AuthUser> {
    const res = await api.get<AuthUser>("/auth/me");
    return res.data;
  },
};
