"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithCustomToken, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { api } from "@/lib/api/client";
import { toApiError } from "@/lib/api/errors";
import { firebaseWebConfig, isFirebaseConfigured } from "./config";

export type RealtimeUnavailableReason =
  | "not_configured" // env NEXT_PUBLIC_FIREBASE_* kosong
  | "token_unavailable" // POST /auth/firebase-token 404/503
  | "auth_failed" // token/sign-in gagal karena alasan lain
  | "permission_denied" // listener ditolak aturan Firestore
  | "listener_error";

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

function firebaseApp(): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseWebConfig);
  return app;
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
      const auth = getAuth(firebaseApp());
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
