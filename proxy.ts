import { NextResponse } from "next/server";

/**
 * Edge proxy — no cookie auth gate (Bearer token lives in localStorage, shared per origin).
 * Dashboard auth is enforced client-side in DashboardAuthShell via GET /auth/me.
 * /platform-admin: token admin di sessionStorage (per tab); gate di client + 401 dari /admin/*.
 */
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/platform-admin/:path*", "/login", "/register", "/register/:path*"],
};
