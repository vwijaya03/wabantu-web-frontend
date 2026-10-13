import { test, type APIRequestContext, type Page } from "@playwright/test";

/** Semua nilai dari env. Tidak ada kredensial di repo. */
export const E2E = {
  baseURL: (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  /** Backend api-go langsung (bukan lewat rewrite Next), untuk cek reachability & API asserts. */
  apiBaseURL: (process.env.E2E_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, ""),
  clientEmail: process.env.E2E_CLIENT_EMAIL ?? "",
  clientPassword: process.env.E2E_CLIENT_PASSWORD ?? "",
  adminEmail: process.env.E2E_ADMIN_EMAIL ?? "",
  adminPassword: process.env.E2E_ADMIN_PASSWORD ?? "",
  /** Email khusus lockout (JANGAN akun admin asli; akan terkunci ±15 menit). */
  lockoutEmail: process.env.E2E_LOCKOUT_EMAIL ?? "",
  lockoutAttempts: Number(process.env.E2E_LOCKOUT_ATTEMPTS ?? "10"),
  /** Nama tenant (companyName) yang aksesnya sudah disetujui owner untuk "Pantau". */
  impersonateTenant: process.env.E2E_IMPERSONATE_TENANT ?? "",
  /** Provider target di UI AI Providers: gemini | anthropic | openai. */
  targetProvider: process.env.E2E_TARGET_PROVIDER ?? "gemini",
  /** Pesan reseller pemicu order, & label tier + harga satuan yang diharapkan (format teks di UI). */
  orderMessage: process.env.E2E_ORDER_MESSAGE ?? "",
  expectedTier: process.env.E2E_EXPECTED_TIER ?? "",
  expectedUnitPrice: process.env.E2E_EXPECTED_UNIT_PRICE ?? "",
};

export function api(path: string): string {
  return `${E2E.apiBaseURL}/api/v1${path.startsWith("/") ? path : `/${path}`}`;
}

let reachable: boolean | null = null;
/** Backend dianggap hidup bila ada respons HTTP apa pun (401 juga OK) dari /auth/me. */
export async function backendReachable(request: APIRequestContext): Promise<boolean> {
  if (reachable !== null) return reachable;
  try {
    await request.get(api("/auth/me"), { timeout: 5_000, failOnStatusCode: false });
    reachable = true;
  } catch {
    reachable = false;
  }
  return reachable;
}

export async function requireBackend(request: APIRequestContext): Promise<void> {
  const ok = await backendReachable(request);
  test.skip(!ok, `SKIP: backend tidak terjangkau di ${E2E.apiBaseURL} (jalankan \`encore run\` atau set E2E_API_BASE_URL)`);
}

export function requireEnv(...names: (keyof typeof E2E)[]): void {
  const missing = names.filter((n) => !E2E[n]);
  test.skip(missing.length > 0, `SKIP: env belum diset: ${missing.map(envName).join(", ")}`);
}

function envName(k: string): string {
  return "E2E_" + k.replace(/([A-Z])/g, "_$1").toUpperCase();
}

export async function step(page: Page, name: string): Promise<void> {
  await test.info().attach(name, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
}
