"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { authApi } from "@/lib/api/auth";
import { hasAccessToken } from "@/lib/auth/session";

/** If a valid Bearer session exists, send user to dashboard (no cookie check). */
export function LoginSessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!hasAccessToken()) {
        if (!cancelled) setChecking(false);
        return;
      }
      try {
        await authApi.me();
        if (!cancelled) router.replace(next);
      } catch {
        if (!cancelled) setChecking(false);
      }
    }

    void check();
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  if (checking && hasAccessToken()) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">Memeriksa sesi…</p>
      </div>
    );
  }

  return <>{children}</>;
}
