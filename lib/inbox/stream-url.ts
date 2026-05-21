import { getAccessToken } from "@/lib/auth/session";
import { env } from "@/lib/env";

function withApiV1Suffix(base: string): string {
  const trimmed = base.replace(/\/$/, "");
  if (trimmed.endsWith("/api/v1")) return trimmed;
  return `${trimmed}/api/v1`;
}

function isLoopbackApiBase(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch {
    return (
      url.includes("://localhost") ||
      url.includes("://127.0.0.1") ||
      url.includes("[::1]")
    );
  }
}

function pageIsLocalhost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

/**
 * SSE base URL for inbox stream.
 * - NEXT_PUBLIC_SSE_API_URL is used only when safe for the current page origin.
 * - Local dev on localhost: direct api-go (:4000) avoids Next rewrite buffering.
 * - ngrok / production: same-origin `/api/v1` (Next proxies to API server-side).
 *   Public origins cannot call loopback (Chrome Private Network Access).
 */
export function resolveInboxStreamBase(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const { hostname, origin } = window.location;
  const onLocalhost = pageIsLocalhost(hostname);

  const configured = env.sseApiUrl.replace(/\/$/, "");
  if (configured && (!isLoopbackApiBase(configured) || onLocalhost)) {
    return configured;
  }

  if (process.env.NODE_ENV === "development" && onLocalhost) {
    return withApiV1Suffix("http://localhost:4000");
  }

  // Next.js route proxies SSE server-side (ngrok-safe; avoids rewrite buffering).
  return `${origin}/api/inbox/stream`;
}

/** Full EventSource URL including access_token query param. */
export function inboxStreamUrl(): string | null {
  const token = getAccessToken();
  if (!token) return null;

  const base = resolveInboxStreamBase();
  if (!base) return null;

  const q = new URLSearchParams({ access_token: token });
  // Next proxy route (`app/api/inbox/stream`) already includes the path segment.
  if (base.endsWith("/api/inbox/stream")) {
    return `${base}?${q.toString()}`;
  }
  return `${base}/inbox/stream?${q.toString()}`;
}
