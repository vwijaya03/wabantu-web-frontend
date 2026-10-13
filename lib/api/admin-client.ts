import axios, { type AxiosInstance } from "axios";
import { clearAdminSession, getAdminToken } from "@/lib/auth/admin-session";
import { env } from "@/lib/env";

export const ADMIN_LOGIN_PATH = "/platform-admin/login";

/**
 * Klien API khusus /admin/* — memakai token sesi admin, BUKAN token client.
 * 401 → hapus sesi admin, redirect ke halaman login superadmin.
 */
export const adminApi: AxiosInstance = axios.create({ baseURL: env.apiUrl, timeout: 30_000 });

adminApi.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let redirecting = false;
adminApi.interceptors.response.use(
  (res) => {
    if (res.data && typeof res.data === "object" && "data" in res.data) {
      const envelope = res.data as { success?: boolean; data?: unknown };
      if (envelope.success === true) res.data = envelope.data;
    }
    return res;
  },
  (error) => {
    const status = error?.response?.status;
    const url: string = error?.config?.url ?? "";
    if (status === 401 && !url.includes("/platform-admin/login") && typeof window !== "undefined" && !redirecting) {
      redirecting = true;
      clearAdminSession();
      const next = window.location.pathname;
      window.location.replace(`${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(next)}`);
    }
    return Promise.reject(error);
  },
);

/**
 * ASUMSI kontrak (be/admin-auth belum punya kode/doc saat ditulis):
 * POST /api/v1/platform-admin/login body {email, password}
 * → {accessToken|token, expiresAt?(ISO/epoch ms), expiresIn?(detik)}
 * 429 = rate limit (header Retry-After opsional), 423 = akun terkunci.
 */
export interface AdminLoginResponse {
  accessToken?: string;
  token?: string;
  expiresAt?: string | number;
  expiresIn?: number;
}

export async function adminLogin(email: string, password: string): Promise<{ token: string; expiresAt: number | null; }> {
  const res = await adminApi.post<AdminLoginResponse>("/api/v1/platform-admin/login", { email, password });
  const d = res.data ?? {};
  const token = d.accessToken ?? d.token;
  if (!token) throw new Error("Respons login admin tidak berisi token.");
  let expiresAt: number | null = null;
  if (typeof d.expiresAt === "number") expiresAt = d.expiresAt;
  else if (typeof d.expiresAt === "string") expiresAt = Date.parse(d.expiresAt) || null;
  else if (typeof d.expiresIn === "number") expiresAt = Date.now() + d.expiresIn * 1000;
  return { token, expiresAt };
}
