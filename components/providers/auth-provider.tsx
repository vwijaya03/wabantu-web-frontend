"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { authApi, type AuthUser } from "@/lib/api/auth";
import { currentSessionKind, loadSessionUser } from "@/lib/auth/load-session-user";
import { ADMIN_LOGIN_PATH } from "@/lib/auth/admin-session";
import { adminLogout } from "@/lib/api/admin-client";
import { setProfileHint } from "@/lib/auth/profile-hint";
import { dispatchAuthSessionUpdated } from "@/lib/auth/session-sync";

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Auth context seeded by DashboardAuthShell after client-side GET /auth/me.
 *
 * refresh() re-fetches the user after explicit actions (profile update, role change).
 */
export function AuthProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: AuthUser | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);

  const refresh = useCallback(async () => {
    try {
      // Sesi tenant (client/Pantau) → /auth/me; hanya admin → /platform-admin/me.
      const me = await loadSessionUser();
      setProfileHint({ email: me.email, name: me.name });
      setUser(me);
      dispatchAuthSessionUpdated(me);
    } catch {
      setUser(null);
    }
  }, []);

  const logout = useCallback(async () => {
    if (currentSessionKind() === "admin") {
      // Hanya sesi admin: hapus sesi admin (in-memory), kembali ke login admin.
      await adminLogout(); // revoke token di BE (best-effort), lalu hapus sesi in-memory
      setUser(null);
      if (typeof window !== "undefined") window.location.href = ADMIN_LOGIN_PATH;
      return;
    }
    try {
      await authApi.logout();
    } catch {
      // Even if API is unreachable, clear local auth state so user can proceed.
    } finally {
      setUser(null);
      if (typeof window !== "undefined") window.location.href = "/login";
    }
  }, []);

  const value = useMemo(
    () => ({ user, setUser, refresh, logout }),
    [user, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
