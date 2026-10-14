"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  inMemoryPersistence,
  initializeAuth,
  signInWithCustomToken,
  signOut,
  type Auth,
} from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { api } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { firebaseWebConfig, isFirebaseConfigured } from "./config";

export type RealtimeUnavailableReason =
  | "not_configured" // env NEXT_PUBLIC_FIREBASE_* kosong
  | "token_unavailable" // POST /auth/firebase-token 404/503
  | "auth_failed" // token/sign-in gagal karena alasan lain
  | "permission_denied" // listener ditolak aturan Firestore
  | "listener_error"
  | "signed_out"; // firebaseSignOut() (logout / 401) menutup listener

export class RealtimeUnavailableError extends Error {
  constructor(public reason: RealtimeUnavailableReason, message?: string) {
    super(message ?? reason);
  }
}

let app: FirebaseApp | null = null;
export interface FirebaseSession {
  auth: Auth;
  db: Firestore;
  /** Klaim tenant dari server — dipakai untuk menyusun path baca. */
  tenantId: string;
  role: "owner" | "staff" | "super_admin";
}

/** Respons POST /auth/firebase-token (API_AI_CONFIG.md §5). */
interface FirebaseTokenResponse {
  token: string;
  tenantId: string;
  role: "owner" | "staff" | "super_admin";
  expiresAt: string;
  projectId: string;
}

let signInPromise: Promise<FirebaseSession> | null = null;
let authInstance: Auth | null = null;
/** Listener aktif: unsub + callback agar hook pindah ke polling saat sign-out. */
const activeListeners = new Set<{ unsub: () => void; onTornDown: () => void }>();

/** IndexedDB bawaan Firebase Auth (persistence lama) — dihapus best-effort agar refresh token lama tidak tersisa. */
const LEGACY_FIREBASE_AUTH_DB = "firebaseLocalStorageDb";
let legacyCleared = false;
function clearLegacyFirebaseAuthStorage(): void {
  if (legacyCleared || typeof window === "undefined") return;
  legacyCleared = true;
  try {
    window.indexedDB?.deleteDatabase(LEGACY_FIREBASE_AUTH_DB);
  } catch {
    /* best effort */
  }
}
clearLegacyFirebaseAuthStorage();

function firebaseApp(): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseWebConfig);
  return app;
}

/** Auth dengan inMemoryPersistence: tidak ada refresh token di IndexedDB/localStorage; reload = sign-in ulang. */
function firebaseAuth(): Auth {
  if (!authInstance) {
    try {
      authInstance = initializeAuth(firebaseApp(), { persistence: inMemoryPersistence });
    } catch {
      // Sudah diinisialisasi (HMR) — pakai instance yang ada.
      authInstance = getAuth(firebaseApp());
    }
  }
  return authInstance;
}

/** Daftarkan listener Firestore agar ditutup oleh firebaseSignOut(). Mengembalikan fungsi deregister. */
export function registerFirebaseListener(unsub: () => void, onTornDown: () => void): () => void {
  const entry = { unsub, onTornDown };
  activeListeners.add(entry);
  return () => {
    activeListeners.delete(entry);
  };
}

/** Sign-out Firebase: tutup semua listener, reset cache sign-in, signOut(auth). Aman dipanggil berulang. */
export async function firebaseSignOut(): Promise<void> {
  signInPromise = null;
  const entries = [...activeListeners];
  activeListeners.clear();
  for (const e of entries) {
    try {
      e.unsub();
    } catch {
      /* ignore */
    }
    e.onTornDown();
  }
  if (!authInstance) return;
  try {
    await signOut(authInstance);
  } catch {
    /* ignore */
  }
}

/**
 * POST /api/v1/auth/firebase-token (body diabaikan; klaim dari sesi server) lalu signInWithCustomToken.
 * 404/503 → realtime tidak tersedia (fallback polling). Di-cache per halaman; gagal → cache dibuang.
 */
export function ensureFirebaseSignIn(): Promise<FirebaseSession> {
  if (!isFirebaseConfigured()) return Promise.reject(new RealtimeUnavailableError("not_configured"));
  if (!signInPromise) {
    signInPromise = (async () => {
      let data: FirebaseTokenResponse;
      try {
        data = (await api.post<FirebaseTokenResponse>("/auth/firebase-token")).data;
      } catch (err) {
        const e = toApiError(err);
        if (e.status === 404 || e.status === 503) throw new RealtimeUnavailableError("token_unavailable", e.message);
        throw new RealtimeUnavailableError("auth_failed", e.message);
      }
      if (!data?.token || !data.tenantId) throw new RealtimeUnavailableError("auth_failed", "respons token tidak lengkap");
      const auth = firebaseAuth();
      try {
        await signInWithCustomToken(auth, data.token);
      } catch (err) {
        throw new RealtimeUnavailableError("auth_failed", err instanceof Error ? err.message : String(err));
      }
      return { auth, db: getFirestore(firebaseApp()), tenantId: data.tenantId, role: data.role };
    })().catch((err) => {
      signInPromise = null;
      throw err;
    });
  }
  return signInPromise;
}
