"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { WabantuLogo } from "@/components/brand/wabantu-logo";
import { InboxActivityBridge } from "@/components/dashboard/inbox-activity-bridge";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { Topbar } from "@/components/dashboard/topbar";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import {
  authApi,
  hasTenantDashboardAccess,
  isPlatformOperatorHome,
  type AuthUser,
} from "@/lib/api/auth";
import { hasAccessToken } from "@/lib/auth/session";

export function DashboardAuthShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!hasAccessToken()) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
        return;
      }
      try {
        const me = await authApi.me();
        if (!cancelled) {
          setUser(me);
          const path = pathname || "/dashboard";
          if (isPlatformOperatorHome(me) && !path.startsWith("/dashboard/admin")) {
            router.replace("/dashboard/admin");
            return;
          }
          if (
            me.role === "super_admin" &&
            !hasTenantDashboardAccess(me) &&
            path !== "/dashboard/admin" &&
            !path.startsWith("/dashboard/admin")
          ) {
            router.replace("/dashboard/admin");
            return;
          }
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted/20">
        <p className="text-sm text-muted-foreground">Memuat dashboard…</p>
      </div>
    );
  }

  return (
    <AuthProvider initialUser={user}>
      {hasTenantDashboardAccess(user) ? <InboxActivityBridge /> : null}
      <div className="grid min-h-svh grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="hidden border-r bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Link
              href={
                isPlatformOperatorHome(user) ? "/dashboard/admin" : "/dashboard"
              }
              className="flex items-center gap-2"
            >
              <WabantuLogo />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
        </aside>
        <div className="flex min-w-0 flex-col">
          <ImpersonationBanner />
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-muted/20 p-6 lg:p-8">
            <div className="mx-auto max-w-6xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
