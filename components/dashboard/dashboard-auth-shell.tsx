"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
import { toApiError } from "@/lib/api/errors";
import { rateLimitTitle, RATE_LIMIT_USER_MESSAGE } from "@/lib/api/rate-limit";
import { clearClientSession, hasAccessToken } from "@/lib/auth/session";
import { installAuthCrossTabSync } from "@/lib/auth/session-cross-tab";
import { AUTH_SESSION_UPDATED } from "@/lib/auth/session-sync";
import { tenantContextKey } from "@/lib/auth/tenant-context";
import { SessionReauthDialog } from "@/components/auth/session-reauth-dialog";
import { DashboardRateLimitNotice } from "@/components/dashboard/dashboard-rate-limit-notice";
import { setProfileHint } from "@/lib/auth/profile-hint";
import { requestSessionReauth } from "@/lib/auth/session-reauth";
import { useSyncQueriesOnTenantChange } from "@/hooks/use-sync-queries-on-tenant-change";
import {
  TenantSwitchOverlay,
  TenantSwitchProvider,
} from "@/components/providers/tenant-switch-provider";

function applyPlatformRouteGuards(
  me: AuthUser,
  path: string,
  router: ReturnType<typeof useRouter>,
): boolean {
  const isAdminConsole =
    path === "/dashboard/admin" || path.startsWith("/dashboard/admin/");

  if (isPlatformOperatorHome(me) && !isAdminConsole) {
    router.replace("/dashboard/admin?needTenant=1");
    return true;
  }
  if (
    me.role === "super_admin" &&
    !hasTenantDashboardAccess(me) &&
    !isAdminConsole
  ) {
    router.replace("/dashboard/admin?needTenant=1");
    return true;
  }
  return false;
}

export function DashboardAuthShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const initialNextPathRef = useRef(pathname || "/dashboard");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  useSyncQueriesOnTenantChange(user);

  const reloadSessionRef = useRef<(() => void) | null>(null);

  // Fetch /auth/me once per dashboard session — not on every client-side navigation.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nextPath = initialNextPathRef.current;
      if (!hasAccessToken()) {
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
        return;
      }
      try {
        const me = await authApi.me();
        if (cancelled) return;
        setProfileHint({ email: me.email, name: me.name });
        setUser(me);
        setRateLimited(false);
        // Always mark ready after /auth/me — route guards may redirect (e.g. super_admin
        // /dashboard → /dashboard/admin) and must not leave the shell on "Memuat dashboard…".
        setReady(true);
        applyPlatformRouteGuards(me, nextPath, router);
      } catch (err) {
        if (cancelled) return;
        const apiErr = toApiError(err);
        if (apiErr.status === 429) {
          setRateLimited(true);
          return;
        }
        if (apiErr.status === 401 && hasAccessToken()) {
          const ok = await requestSessionReauth();
          if (cancelled) return;
          if (ok) {
            try {
              const me = await authApi.me();
              if (cancelled) return;
              setProfileHint({ email: me.email, name: me.name });
              setUser(me);
              setRateLimited(false);
              setReady(true);
              applyPlatformRouteGuards(me, nextPath, router);
              return;
            } catch {
              /* fall through to login */
            }
          }
        }
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      }
    }

    reloadSessionRef.current = () => {
      void load();
    };
    void load();
    return () => {
      cancelled = true;
      reloadSessionRef.current = null;
    };
  }, [router]);

  // Logout / login / reauth in another tab
  useEffect(() => {
    return installAuthCrossTabSync({
      onLogout: () => {
        clearClientSession();
        const path = window.location.pathname;
        window.location.replace(`/login?next=${encodeURIComponent(path)}`);
      },
      onTokenUpdated: () => {
        reloadSessionRef.current?.();
      },
    });
  }, []);

  // Keep shell session in sync after impersonate / stop (AuthProvider.refresh updates context only).
  useEffect(() => {
    if (!ready) return;

    const onSessionUpdated = (ev: Event) => {
      const me = (ev as CustomEvent<AuthUser>).detail;
      if (!me) return;
      setUser(me);
      applyPlatformRouteGuards(me, pathname || "/dashboard", router);
    };

    window.addEventListener(AUTH_SESSION_UPDATED, onSessionUpdated);
    return () => window.removeEventListener(AUTH_SESSION_UPDATED, onSessionUpdated);
  }, [pathname, ready, router]);

  // Re-run guards when navigating (uses latest shell user, including after impersonation).
  useEffect(() => {
    if (!user || !ready) return;
    applyPlatformRouteGuards(user, pathname || "/dashboard", router);
  }, [pathname, ready, router, user]);

  if (rateLimited && !ready) {
    return (
      <>
        <SessionReauthDialog />
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-muted/20 px-6 text-center">
        <div className="max-w-md space-y-2 rounded-lg border border-amber-500/50 bg-amber-500/10 px-5 py-4">
          <p className="text-sm font-medium text-amber-950 dark:text-amber-50">
            {rateLimitTitle()}
          </p>
          <p className="text-sm text-muted-foreground">
            {RATE_LIMIT_USER_MESSAGE}
          </p>
        </div>
        <button
          type="button"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => window.location.reload()}
        >
          Muat ulang halaman
        </button>
      </div>
      </>
    );
  }

  if (!ready || !user) {
    return (
      <>
        <SessionReauthDialog />
        <div className="flex min-h-svh items-center justify-center bg-muted/20">
          <p className="text-sm text-muted-foreground">Memuat dashboard…</p>
        </div>
      </>
    );
  }

  const authProviderKey = tenantContextKey(user);

  return (
    <>
      <SessionReauthDialog />
      <AuthProvider key={authProviderKey} initialUser={user}>
      <TenantSwitchProvider>
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
          <main className="relative flex-1 overflow-y-auto bg-muted/20 p-6 lg:p-8">
            <TenantSwitchOverlay />
            <div className="mx-auto max-w-6xl space-y-6">
              <DashboardRateLimitNotice />
              {children}
            </div>
          </main>
        </div>
      </div>
      </TenantSwitchProvider>
      </AuthProvider>
    </>
  );
}
