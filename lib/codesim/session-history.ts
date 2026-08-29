const STORAGE_KEY = "codesim:session-ids";
const CLIENT_TOKEN_KEY = "codesim:client-token";
const MAX_TRACKED = 50;

export function getOrCreateClientToken(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(CLIENT_TOKEN_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(CLIENT_TOKEN_KEY, created);
    return created;
  } catch {
    return "";
  }
}

export function getCodesimSessionIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return [];
  }
}

export function trackCodesimSession(sessionId: string) {
  if (typeof window === "undefined" || !sessionId) return;
  const ids = getCodesimSessionIds().filter((id) => id !== sessionId);
  ids.unshift(sessionId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_TRACKED)));
}
