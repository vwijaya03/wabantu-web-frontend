/**
 * Sesi superadmin — TERPISAH dari sesi client (lib/auth/session.ts).
 * Disimpan di sessionStorage (hilang saat tab ditutup) + batas waktu lokal pendek.
 * Server tetap sumber kebenaran: 401 dari /admin/* → hapus sesi dan ke /platform-admin/login.
 */
const KEY = "wabantu_admin_session";
/** Event in-tab agar UI (menu, gate) ikut berubah saat sesi admin set/clear. */
export const ADMIN_SESSION_EVENT = "wabantu-admin-session";

function notify(): void {
  try {
    window.dispatchEvent(new Event(ADMIN_SESSION_EVENT));
  } catch {
    /* ignore */
  }
}
/** Fallback bila server tidak mengirim expiresAt/expiresIn. */
const DEFAULT_TTL_MS = 30 * 60 * 1000;

interface StoredAdminSession {
  token: string;
  expiresAt: number;
}

export function setAdminSession(token: string, expiresAt?: number | null): void {
  if (typeof window === "undefined") return;
  const exp = expiresAt && expiresAt > Date.now() ? expiresAt : Date.now() + DEFAULT_TTL_MS;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ token, expiresAt: exp } satisfies StoredAdminSession));
  } catch {
    /* ignore */
  }
  notify();
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredAdminSession;
    if (!s.token || Date.now() >= s.expiresAt) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return s.token;
  } catch {
    return null;
  }
}

export function clearAdminSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  notify();
}

export function hasAdminSession(): boolean {
  return Boolean(getAdminToken());
}
