/**
 * Centralized env access. NEXT_PUBLIC_ vars are inlined at build time, so
 * accessing them through this file makes the dependency obvious and
 * eases future migration to a typed validator like @t3-oss/env-nextjs.
 */
const apiBackend = (
  process.env.API_BACKEND_URL ?? "http://localhost:4000"
).replace(/\/$/, "");

/** Ensures server/browser bases end with `/api/v1` (Encore api-go global prefix). */
function withApiV1Prefix(base: string): string {
  const trimmed = base.replace(/\/$/, "");
  if (trimmed.endsWith("/api/v1")) return trimmed;
  return `${trimmed}/api/v1`;
}

export const env = {
  // Browser requests hit same-origin `/api/v1/...` (rewritten to api-go in dev).
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "/api/v1",
  /**
   * Optional absolute API base for SSE only, e.g. `http://localhost:4000/api/v1`.
   * Paths are appended as `/inbox/stream` (full URL: base + path).
   * EventSource through Next rewrites often breaks; point at API directly.
   */
  sseApiUrl: process.env.NEXT_PUBLIC_SSE_API_URL
    ? withApiV1Prefix(process.env.NEXT_PUBLIC_SSE_API_URL)
    : "",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "WABantu",
  appTagline:
    process.env.NEXT_PUBLIC_APP_TAGLINE ?? "AI WhatsApp Auto-Reply untuk UMKM",
  /**
   * Server-side fetch base including `/api/v1` (Encore api-go).
   * `API_URL_INTERNAL` may be host only (`http://localhost:4000`) or full base.
   */
  apiUrlInternal: withApiV1Prefix(
    process.env.API_URL_INTERNAL?.replace(/\/$/, "") ?? apiBackend,
  ),
};
