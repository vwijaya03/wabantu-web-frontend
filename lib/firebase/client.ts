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
let signInPromise: Promise<{ auth: Auth; db: Firestore }> | null = null;

function firebaseApp(): FirebaseApp {
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseWebConfig);
  return app;
}

/**
 * Ambil custom token dari backend (POST /api/v1/auth/firebase-token, butuh login; tenant dari sesi)
 * lalu signInWithCustomToken. Hasil di-cache per halaman; gagal → cache dibuang agar bisa dicoba lagi.
 * TODO(BE): endpoint & nama field respons belum ada di docs/API_AI_CONFIG.md; diterima `token` atau `customToken`.
 */
export function ensureFirebaseSignIn(): Promise<{ auth: Auth; db: Firestore }> {
  if (!isFirebaseConfigured()) return Promise.reject(new RealtimeUnavailableError("not_configured"));
  if (!signInPromise) {
    signInPromise = (async () => {
      let token: string | undefined;
      try {
        const res = await api.post<{ token?: string; customToken?: string }>("/auth/firebase-token");
        token = res.data.token ?? res.data.customToken;
      } catch (err) {
        const e = toApiError(err);
        if (e.status === 404 || e.status === 503) throw new RealtimeUnavailableError("token_unavailable", e.message);
        throw new RealtimeUnavailableError("auth_failed", e.message);
      }
      if (!token) throw new RealtimeUnavailableError("auth_failed", "respons token kosong");
      const auth = getAuth(firebaseApp());
      try {
        await signInWithCustomToken(auth, token);
      } catch (err) {
        throw new RealtimeUnavailableError("auth_failed", err instanceof Error ? err.message : String(err));
      }
      return { auth, db: getFirestore(firebaseApp()) };
    })().catch((err) => {
      signInPromise = null;
      throw err;
    });
  }
  return signInPromise;
}
