"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, onSnapshot, orderBy, query, type DocumentData } from "firebase/firestore";
import {
  ensureFirebaseSignIn,
  registerFirebaseListener,
  RealtimeUnavailableError,
  type RealtimeUnavailableReason,
} from "@/lib/firebase/client";
import { isFirebaseConfigured } from "@/lib/firebase/config";

export type RealtimeMode = "connecting" | "realtime" | "polling";

export interface UseRealtimeCollectionOptions<T> {
  /** Kunci unik (mis. ["simulator", sessionId]) untuk cache polling. */
  queryKey: readonly unknown[];
  /**
   * Penyusun path koleksi dari tenantId klaim server; null = belum bisa (mis. conversationId belum ada) → polling.
   * Berikan juga `pathKey` stabil (mis. conversationId) supaya listener tidak dibuat ulang tiap render.
   */
  path: ((tenantId: string) => string) | null;
  pathKey: string | null;
  orderField: string;
  /** Ubah dokumen Firestore jadi item; kembalikan null untuk melewati dokumen tak valid. */
  mapDoc: (id: string, data: DocumentData) => T | null;
  /** Fallback polling (API REST). */
  poll: () => Promise<T[]>;
  pollIntervalMs?: number;
  enabled?: boolean;
}

/**
 * Dengarkan koleksi Firestore (read-only); jatuh ke polling REST bila Firebase tidak dikonfigurasi,
 * endpoint token 404/503, sign-in gagal, atau listener ditolak (permission-denied/error).
 */
export function useRealtimeCollection<T>(opts: UseRealtimeCollectionOptions<T>) {
  const { path, pathKey, orderField, mapDoc, poll, pollIntervalMs = 1500, enabled = true } = opts;
  const canTryRealtime = enabled && Boolean(path) && Boolean(pathKey) && isFirebaseConfigured();
  const connKey = canTryRealtime ? `${pathKey}|${orderField}` : null;
  // State hanya di-set dari callback async (bukan langsung di body effect).
  const [rt, setRt] = useState<{
    key: string;
    ok: boolean;
    reason: RealtimeUnavailableReason | null;
    items: T[];
  } | null>(null);

  useEffect(() => {
    if (!connKey || !path) return;
    let unsub: (() => void) | null = null;
    let deregister: (() => void) | null = null;
    let cancelled = false;
    const fallback = (r: RealtimeUnavailableReason) => {
      if (!cancelled) setRt({ key: connKey, ok: false, reason: r, items: [] });
    };
    ensureFirebaseSignIn()
      .then(({ db, tenantId }) => {
        if (cancelled) return;
        unsub = onSnapshot(
          query(collection(db, path(tenantId)), orderBy(orderField)),
          (snap) => {
            const next: T[] = [];
            snap.forEach((d) => {
              const v = mapDoc(d.id, d.data());
              if (v !== null) next.push(v);
            });
            if (!cancelled) setRt({ key: connKey, ok: true, reason: null, items: next });
          },
          (err) => fallback(err.code === "permission-denied" ? "permission_denied" : "listener_error"),
        );
        deregister = registerFirebaseListener(unsub, () => {
          unsub = null;
          fallback("signed_out");
        });
      })
      .catch((err) => fallback(err instanceof RealtimeUnavailableError ? err.reason : "auth_failed"));
    return () => {
      cancelled = true;
      deregister?.();
      unsub?.();
    };
    // mapDoc sengaja tidak jadi dependency (biasanya fungsi inline).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connKey]);

  const current = rt && rt.key === connKey ? rt : null;
  const mode: RealtimeMode = !connKey ? "polling" : !current ? "connecting" : current.ok ? "realtime" : "polling";
  const reason: RealtimeUnavailableReason | null = !connKey ? "not_configured" : (current?.reason ?? null);
  const items: T[] | null = mode === "realtime" && current ? current.items : null;

  const polling = mode === "polling";
  const pollQuery = useQuery({
    queryKey: [...opts.queryKey, "poll"],
    queryFn: poll,
    // Saat realtime masih menyambung pun ambil sekali, supaya layar tidak kosong.
    enabled: enabled && mode !== "realtime",
    refetchInterval: (q) => (polling && q.state.status !== "error" ? pollIntervalMs : false),
    retry: false,
  });

  return {
    items: mode === "realtime" ? (items ?? []) : (pollQuery.data ?? []),
    mode,
    reason,
    isLoading: mode === "realtime" ? items === null : pollQuery.isLoading,
    error: mode === "realtime" ? null : pollQuery.error,
    refetch: () => (mode === "realtime" ? Promise.resolve() : pollQuery.refetch().then(() => undefined)),
  };
}
