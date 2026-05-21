"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthUser } from "@/lib/api/auth";
import { tenantContextKey } from "@/lib/auth/tenant-context";
import { AUTH_SESSION_UPDATED } from "@/lib/auth/session-sync";
import { resetTenantScopedQueries } from "@/lib/query/platform-console";

function applyTenantContextChange(
  qc: ReturnType<typeof useQueryClient>,
  prevKeyRef: MutableRefObject<string | null>,
  me: AuthUser,
): void {
  const nextKey = tenantContextKey(me);
  const prevKey = prevKeyRef.current;
  if (prevKey !== null && prevKey !== nextKey) {
    resetTenantScopedQueries(qc);
  }
  prevKeyRef.current = nextKey;
}

/**
 * Clears React Query cache when /auth/me context changes (e.g. impersonate another tenant).
 * Query keys are not tenant-prefixed everywhere; without this, inbox can show the prior tenant.
 */
export function useSyncQueriesOnTenantChange(
  currentUser: AuthUser | null | undefined,
): void {
  const qc = useQueryClient();
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    applyTenantContextChange(qc, prevKeyRef, currentUser);
  }, [currentUser, qc]);

  useEffect(() => {
    const onSessionUpdated = (ev: Event) => {
      const me = (ev as CustomEvent<AuthUser>).detail;
      if (!me) return;
      applyTenantContextChange(qc, prevKeyRef, me);
    };

    window.addEventListener(AUTH_SESSION_UPDATED, onSessionUpdated);
    return () => window.removeEventListener(AUTH_SESSION_UPDATED, onSessionUpdated);
  }, [qc]);
}
