import { AUTH_LOGOUT_SIGNAL_KEY } from "@/lib/auth/session";

const TOKEN_KEY = "wabantu_access_token";

export type AuthCrossTabHandlers = {
  onLogout: () => void;
  onTokenUpdated?: () => void;
};

/**
 * Sync auth across browser tabs via localStorage `storage` events.
 * (Events fire in other tabs only, not the tab that wrote the value.)
 */
export function installAuthCrossTabSync(handlers: AuthCrossTabHandlers): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === TOKEN_KEY) {
      if (!e.newValue) {
        handlers.onLogout();
        return;
      }
      handlers.onTokenUpdated?.();
      return;
    }
    if (e.key === AUTH_LOGOUT_SIGNAL_KEY && e.newValue) {
      handlers.onLogout();
    }
  };

  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
