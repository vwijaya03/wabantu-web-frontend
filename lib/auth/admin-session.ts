/**
 * Sesi superadmin — Bearer di memori + sessionStorage (per tab).
 * Refresh di tab yang sama tetap login; tab baru = login ulang. Terpisah dari sesi client (localStorage).
 * Kontrak: POST /api/v1/platform-admin/login → {accessToken, expiresAt (RFC3339)}.
 */
const STORAGE_KEY = "wabantu_admin_session";
export const ADMIN_LOGIN_PATH = "/platform-admin/login";

/** Bentuk persist sessionStorage — expiresAt wajib (ms epoch); RFC3339 mirror dari login API. */
type StoredAdminSession = {
  accessToken: string;
  expiresAt: number;
  expiresAtRfc3339: string;
};

type ParsedStored = {
  session: StoredAdminSession;
  /** Blob lama tanpa expiresAtRfc3339 perlu ditulis ulang sekali. */
  needsRfcUpgrade: boolean;
};

function parseExpiresAtMs(value: unknown, rfc3339: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Date.parse(value);
    if (Number.isFinite(n)) return n;
  }
  if (typeof rfc3339 === "string" && rfc3339.trim() !== "") {
    const n = Date.parse(rfc3339);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

function normalizeStoredSession(
  accessToken: string,
  expiresAtMs: number,
  expiresAtRfc3339: string,
): StoredAdminSession | null {
  if (!accessToken || !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) return null;
  const rfc =
    expiresAtRfc3339 && Number.isFinite(Date.parse(expiresAtRfc3339))
      ? expiresAtRfc3339
      : new Date(expiresAtMs).toISOString();
  if (Math.abs(expiresAtMs - Date.parse(rfc)) > 60_000) return null;
  return { accessToken, expiresAt: expiresAtMs, expiresAtRfc3339: rfc };
}

function parseStoredRaw(raw: string): ParsedStored | null {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const accessToken = typeof parsed.accessToken === "string" ? parsed.accessToken : "";
  const expiresAtRfc3339Raw =
    typeof parsed.expiresAtRfc3339 === "string" ? parsed.expiresAtRfc3339 : "";
  const exp = parseExpiresAtMs(parsed.expiresAt, expiresAtRfc3339Raw || parsed.expiresAt);
  const normalized = normalizeStoredSession(accessToken, exp, expiresAtRfc3339Raw);
  if (!normalized) return null;
  const needsRfcUpgrade = expiresAtRfc3339Raw.trim() === "";
  return { session: normalized, needsRfcUpgrade };
}

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

/** Baca storage tanpa menulis; tidak menghapus blob invalid (untuk deteksi `had` saat logout). */
function peekStored(): StoredAdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseStoredRaw(raw)?.session ?? null;
  } catch {
    return null;
  }
}

function readStored(): StoredAdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = parseStoredRaw(raw);
    if (!parsed) {
      clearStored();
      return null;
    }
    if (parsed.needsRfcUpgrade) {
      writeStored(parsed.session.accessToken, parsed.session.expiresAt, parsed.session.expiresAtRfc3339);
    }
    return parsed.session;
  } catch {
    clearStored();
    return null;
  }
}

function writeStored(accessToken: string, expiresAtMs: number, expiresAtRfc3339: string): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeStoredSession(accessToken, expiresAtMs, expiresAtRfc3339);
  if (!normalized) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
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

function hasStoredAdminKey(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) != null;
  } catch {
    return false;
  }
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
  writeStored(accessToken, exp, expiresAtRfc3339);
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
  const had = token !== null || peekStored() !== null || hasStoredAdminKey();
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
