const TOKEN_KEY = "wabantu_access_token";

/** Persist JWT for axios + SSE (tab-scoped; cleared on logout / 401). */
export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (!token) {
    sessionStorage.removeItem(TOKEN_KEY);
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function hasAccessToken(): boolean {
  return Boolean(getAccessToken());
}

export function clearClientSession(): void {
  setAccessToken(null);
}
