/**
 * Sesi superadmin — Bearer di memori + sessionStorage (per tab).
 * Refresh di tab yang sama tetap login; tab baru = login ulang. Terpisah dari sesi client (localStorage).
 * Kontrak: POST /api/v1/platform-admin/login → {accessToken, expiresAt (RFC3339)}.
 */
const STORAGE_KEY = "wabantu_admin_session";
export const ADMIN_LOGIN_PATH = "/platform-admin/login";

type StoredAdminSession = {
  accessToken: string;
  expiresAt: number;
};

let token: string | null = null;
let expiresAt = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function clearStored(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

function readStored(): StoredAdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAdminSession>;
    const accessToken = typeof parsed.accessToken === "string" ? parsed.accessToken : "";
    const exp = typeof parsed.expiresAt === "number" ? parsed.expiresAt : NaN;
    if (!accessToken || !Number.isFinite(exp) || exp <= Date.now()) {
      clearStored();
      return null;
    }
    return { accessToken, expiresAt: exp };
  } catch {
    clearStored();
    return null;
  }
}

function writeStored(accessToken: string, expiresAtMs: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ accessToken, expiresAt: expiresAtMs }));
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function scheduleExpiryTimer(): void {
  if (timer) clearTimeout(timer);
  if (!token || expiresAt <= Date.now()) return;
  timer = setTimeout(() => {
    clearAdminSession();
    redirectToAdminLogin();
  }, Math.min(expiresAt - Date.now(), 2_147_000_000));
}

function hydrateFromStorage(): void {
  const stored = readStored();
  if (!stored) return;
  token = stored.accessToken;
  expiresAt = stored.expiresAt;
  scheduleExpiryTimer();
}

if (typeof window !== "undefined") {
  hydrateFromStorage();
}

export function subscribeAdminSession(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function redirectToAdminLogin(): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith(ADMIN_LOGIN_PATH)) return;
  const next = window.location.pathname + window.location.search;
  window.location.replace(`${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(next)}`);
}

/** expiresAtRfc3339 dari respons login. Token tanpa expiresAt valid tidak diterima. */
export function setAdminSession(accessToken: string, expiresAtRfc3339: string): void {
  const exp = Date.parse(expiresAtRfc3339);
  if (!accessToken || !Number.isFinite(exp) || exp <= Date.now()) {
    clearAdminSession();
    return;
  }
  token = accessToken;
  expiresAt = exp;
  writeStored(accessToken, exp);
  scheduleExpiryTimer();
  emit();
}

export function getAdminToken(): string | null {
  if (!token && typeof window !== "undefined") {
    hydrateFromStorage();
  }
  if (token && Date.now() >= expiresAt) {
    clearAdminSession();
    return null;
  }
  return token;
}

export function hasAdminSession(): boolean {
  return Boolean(getAdminToken());
}

export function clearAdminSession(): void {
  const had = token !== null || Boolean(readStored());
  token = null;
  expiresAt = 0;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  clearStored();
  if (had) {
    emit();
    void import("@/lib/firebase/client").then((m) => m.firebaseSignOut()).catch(() => undefined);
  }
}
