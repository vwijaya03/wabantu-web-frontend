import axios, { AxiosError, type AxiosInstance } from "axios";
import { env } from "@/lib/env";

/**
 * Browser-side axios instance.
 * - withCredentials so the HttpOnly auth cookie is included automatically
 * - normalizes API errors into a typed shape the UI layer can render
 */
export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  withCredentials: true,
  timeout: 30_000,
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
    if (error.response?.status === 401 && typeof window !== "undefined") {
      // Defer the redirect so React isn't mid-render when we navigate.
      const path = window.location.pathname;
      if (!path.startsWith("/login") && !path.startsWith("/register")) {
        window.location.href = `/login?next=${encodeURIComponent(path)}`;
      }
    }
    return Promise.reject(error);
  },
);
