/**
 * Token impersonation ("Pantau" tenant) — HANYA di memori, seperti sesi admin.
 * Kontrak (api-go docs/ADMIN_AUTH.md): POST /admin/impersonate/:tenantId → {ok, tenant, accessToken, expiresAt}
 * (JWT typ:"impersonation", 30 menit). Dipakai klien tenant (`api`) saja; TIDAK PERNAH ke /admin/* (backend: 403).
 */
let token: string | null = null;
let expiresAt = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
let onExpire: (() => void) | null = null;

function emit(): void {
  listeners.forEach((l) => l());
}

export function subscribeImpersonation(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Dipanggil saat token kedaluwarsa (stop impersonation + notifikasi). */
export function setImpersonationExpiryHandler(fn: (() => void) | null): void {
  onExpire = fn;
}

export function setImpersonationSession(accessToken: string, expiresAtRfc3339: string): void {
  const exp = Date.parse(expiresAtRfc3339);
  if (!accessToken || !Number.isFinite(exp) || exp <= Date.now()) {
    clearImpersonationSession();
    return;
  }
  token = accessToken;
  expiresAt = exp;
  // Security: Pantau dimulai → sign-out Firebase dari sesi sebelumnya (best-effort; aman bila Firebase tidak dikonfigurasi).
  void import("@/lib/firebase/client").then((m) => m.firebaseSignOut()).catch(() => undefined);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    clearImpersonationSession();
    onExpire?.();
  }, Math.min(exp - Date.now(), 2_147_000_000));
  emit();
}

export function getImpersonationToken(): string | null {
  if (token && Date.now() >= expiresAt) {
    clearImpersonationSession();
    onExpire?.();
    return null;
  }
  return token;
}

export function clearImpersonationSession(): void {
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
