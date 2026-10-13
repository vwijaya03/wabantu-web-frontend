"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ADMIN_SESSION_EVENT, clearAdminSession, hasAdminSession } from "@/lib/auth/admin-session";

function subscribe(cb: () => void): () => void {
  window.addEventListener(ADMIN_SESSION_EVENT, cb);
  // Cek ulang berkala agar sesi yang kedaluwarsa menutup menu/gate.
  const t = window.setInterval(cb, 30_000);
  return () => {
    window.removeEventListener(ADMIN_SESSION_EVENT, cb);
    window.clearInterval(t);
  };
}

/** Status sesi platform admin (terpisah dari sesi client). SSR → false. */
export function useAdminSession(): { isAdmin: boolean; logoutAdmin: () => void } {
  const isAdmin = useSyncExternalStore(subscribe, hasAdminSession, () => false);
  const logoutAdmin = useCallback(() => clearAdminSession(), []);
  return { isAdmin, logoutAdmin };
}
