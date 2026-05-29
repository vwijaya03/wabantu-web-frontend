const TOKEN_KEY = "wabantu_access_token";
/** Bumped on logout so other tabs can react via `storage` event. */
export const AUTH_LOGOUT_SIGNAL_KEY = "wabantu_auth_logout_at";

let migratedFromSessionStorage = false;

function migrateLegacySessionStorageToken(): void {
  if (typeof window === "undefined" || migratedFromSessionStorage) return;
  migratedFromSessionStorage = true;
  try {
    const legacy = sessionStorage.getItem(TOKEN_KEY);
    if (legacy && !localStorage.getItem(TOKEN_KEY)) {
      localStorage.setItem(TOKEN_KEY, legacy);
    }
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode / blocked storage */
  }
}

/** Persist JWT for axios + SSE (shared across tabs; cleared on logout / 401). */
export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  migrateLegacySessionStorageToken();
  try {
    if (!token) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.setItem(AUTH_LOGOUT_SIGNAL_KEY, String(Date.now()));
      return;
    }
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(AUTH_LOGOUT_SIGNAL_KEY);
  } catch {
    /* ignore */
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  migrateLegacySessionStorageToken();
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function hasAccessToken(): boolean {
  return Boolean(getAccessToken());
}

export function clearClientSession(): void {
  setAccessToken(null);
}
