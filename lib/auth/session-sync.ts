import type { AuthUser } from "@/lib/api/auth";

export const AUTH_SESSION_UPDATED = "wabantu:auth-session-updated";

export function dispatchAuthSessionUpdated(user: AuthUser): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<AuthUser>(AUTH_SESSION_UPDATED, { detail: user }),
  );
}
