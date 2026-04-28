import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic auth gate for the dashboard. Real authorization still
 * happens server-side via `getServerUser()` in the dashboard layout — this
 * file only short-circuits obvious unauthenticated visits at the edge.
 *
 * Important: we intentionally do NOT force-redirect `/login` -> `/dashboard`
 * based on cookie presence alone. A stale/invalid cookie would create a
 * redirect loop:
 *   /login -> /dashboard -> (layout sees invalid session) -> /login -> ...
 *
 * Next.js 16 renamed the file convention from `middleware.ts` to `proxy.ts`.
 */

const COOKIE_NAME = "wabantu_at";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasToken = req.cookies.get(COOKIE_NAME)?.value;

  if (pathname.startsWith("/dashboard")) {
    if (!hasToken) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
