/**
 * Sesi superadmin — HANYA di memori (module-level). Tidak pernah ke localStorage/sessionStorage.
 * Konsekuensi: reload / tab baru = login ulang. Terpisah total dari sesi client (lib/auth/session.ts).
 * Kontrak: POST /api/v1/platform-admin/login → {accessToken, expiresAt (RFC3339)}.
 */
const LEGACY_KEY = "wabantu_admin_session";
export const ADMIN_LOGIN_PATH = "/platform-admin/login";

let token: string | null = null;
let expiresAt = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

// Bersihkan sisa versi lama yang menyimpan token di sessionStorage.
if (typeof window !== "undefined") {
  try {
    sessionStorage.removeItem(LEGACY_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

function emit(): void {
  listeners.forEach((l) => l());
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
  if (timer) clearTimeout(timer);
  // setTimeout dibatasi ~24,8 hari; sesi admin jauh lebih pendek.
  timer = setTimeout(() => {
    clearAdminSession();
    redirectToAdminLogin();
  }, Math.min(exp - Date.now(), 2_147_000_000));
  emit();
}

export function getAdminToken(): string | null {
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
  const had = token !== null;
  token = null;
  expiresAt = 0;
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (had) {
    emit();
    // Security M-1: sesi berakhir → Firebase ikut sign-out (tutup listener).
    void import("@/lib/firebase/client").then((m) => m.firebaseSignOut()).catch(() => undefined);
  }
}
