"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi } from "@/lib/api/auth";
import { safeNext } from "@/lib/auth/safe-next";
import { hasAccessToken } from "@/lib/auth/session";
import { useLocale } from "@/lib/i18n/locale";

type SessionPhase = "pending" | "checking" | "guest";

/**
 * If a valid Bearer session exists, send user to dashboard (no cookie check).
 * First paint always matches SSR (children); token in localStorage is read only in useEffect.
 */
export function LoginSessionGate({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();
  const router = useRouter();
  const search = useSearchParams();
  const next = safeNext(search.get("next"));
  const [phase, setPhase] = useState<SessionPhase>("pending");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!hasAccessToken()) {
        if (!cancelled) setPhase("guest");
        return;
      }
      if (!cancelled) setPhase("checking");
      try {
        await authApi.me();
        if (!cancelled) router.replace(next);
      } catch {
        if (!cancelled) setPhase("guest");
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  if (phase === "checking") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">{t("Memeriksa sesi…")}</p>
      </div>
    );
  }

  return <>{children}</>;
}
