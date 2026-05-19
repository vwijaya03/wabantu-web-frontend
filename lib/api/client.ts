import axios, { AxiosError, type AxiosInstance } from "axios";
import { clearClientSession, getAccessToken } from "@/lib/auth/session";
import { env } from "@/lib/env";

/**
 * Browser API client — Bearer token only (no HttpOnly cookie).
 * Aligns with accessToken in login/register body (Nest also returns this field).
 */
export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiError {
  status: number;
  code: string;
  message: string;
}

export function toApiError(err: unknown): ApiError {
  if (err instanceof AxiosError) {
    const data = err.response?.data as
      | { statusCode?: number; error?: string; message?: string | string[] }
      | undefined;
    const message = Array.isArray(data?.message)
      ? data.message.join(", ")
      : data?.message ?? err.message;
    return {
      status: err.response?.status ?? 0,
      code: data?.error ?? "UnknownError",
      message,
    };
  }
  return {
    status: 0,
    code: "UnknownError",
    message: err instanceof Error ? err.message : String(err),
  };
}

let authRedirectInFlight = false;

function shouldRedirectOn401(requestUrl?: string): boolean {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  if (path.startsWith("/login") || path.startsWith("/register")) return false;
  const url = requestUrl ?? "";
  if (url.includes("/auth/login") || url.includes("/auth/register")) return false;
  return true;
}

api.interceptors.response.use(
  (res) => {
    if (res.data && typeof res.data === "object" && "data" in res.data) {
      const envelope = res.data as { success?: boolean; data?: unknown };
      if (envelope.success === true) {
        res.data = envelope.data;
      }
    }
    return res;
  },
  async (error: AxiosError) => {
    if (
      error.response?.status === 401 &&
      shouldRedirectOn401(error.config?.url) &&
      !authRedirectInFlight
    ) {
      authRedirectInFlight = true;
      clearClientSession();
      const path = window.location.pathname;
      window.location.replace(`/login?next=${encodeURIComponent(path)}`);
    }
    return Promise.reject(error);
  },
);
