import axios, { type AxiosInstance } from "axios";
import { ADMIN_LOGIN_PATH, clearAdminSession, getAdminToken, redirectToAdminLogin } from "@/lib/auth/admin-session";

import { env } from "@/lib/env";

export { ADMIN_LOGIN_PATH };

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
      redirectToAdminLogin();
    }
    return Promise.reject(error);
  },
);

/**
 * Kontrak tetap: POST /api/v1/platform-admin/login {email, password}
 * → {accessToken, expiresAt (RFC3339)}. 429 = rate limit ATAU lockout (tidak ada 423), 400 = field kosong, 401 = generik.
 * Header Authorization di adminApi hanya diisi token admin (getAdminToken) — token impersonasi
 * dari /admin/impersonate disimpan di sesi client dan tidak pernah dikirim ke /admin/*.
 */
export interface AdminLoginResponse {
  accessToken: string;
  expiresAt: string;
}

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const res = await adminApi.post<AdminLoginResponse>("/api/v1/platform-admin/login", { email, password });
  const d = res.data;
  if (!d?.accessToken || !d?.expiresAt || !Number.isFinite(Date.parse(d.expiresAt))) {
    throw new Error("Respons login admin tidak valid.");
  }
  return { accessToken: d.accessToken, expiresAt: d.expiresAt };
}
