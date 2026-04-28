/**
 * Centralized env access. NEXT_PUBLIC_ vars are inlined at build time, so
 * accessing them through this file makes the dependency obvious and
 * eases future migration to a typed validator like @t3-oss/env-nextjs.
 */
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "WABantu",
  appTagline:
    process.env.NEXT_PUBLIC_APP_TAGLINE ?? "AI WhatsApp Auto-Reply untuk UMKM",
  apiUrlInternal: process.env.API_URL_INTERNAL ?? process.env.NEXT_PUBLIC_API_URL,
};
