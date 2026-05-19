import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge proxy — no cookie auth gate (Bearer token lives in sessionStorage).
 * Dashboard auth is enforced client-side in DashboardAuthShell via GET /auth/me.
 */
export function proxy(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
