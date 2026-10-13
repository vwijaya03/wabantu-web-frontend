"use client";

import { useCallback, useSyncExternalStore } from "react";
import { adminLogout } from "@/lib/api/admin-client";
import { hasAdminSession, subscribeAdminSession } from "@/lib/auth/admin-session";

/** Status sesi platform admin (in-memory, terpisah dari sesi client). SSR → false. */
export function useAdminSession(): { isAdmin: boolean; logoutAdmin: () => void } {
  const isAdmin = useSyncExternalStore(subscribeAdminSession, hasAdminSession, () => false);
  const logoutAdmin = useCallback(() => {
    void adminLogout();
  }, []);
  return { isAdmin, logoutAdmin };
}
