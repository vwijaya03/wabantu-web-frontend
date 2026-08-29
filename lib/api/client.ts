import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { toApiError } from "@/lib/api/errors";
import { isTenantContextApiError } from "@/lib/api/tenant-context-error";
import { isRateLimitError, notifyRateLimitOnce } from "@/lib/api/rate-limit";
import { clearClientSession, getAccessToken } from "@/lib/auth/session";
import { clearProfileHint } from "@/lib/auth/profile-hint";
import { requestSessionReauth } from "@/lib/auth/session-reauth";
import { getOrCreateClientToken } from "@/lib/codesim/session-history";
import { env } from "@/lib/env";

export { toApiError, type ApiError } from "@/lib/api/errors";

export type ApiRequestConfig = InternalAxiosRequestConfig & {
  /** Skip 401 re-auth modal (login, reauth, register). */
  skipSessionReauth?: boolean;
  /** Do not attach Authorization (reauth sends token in body). */
  skipAuthHeader?: boolean;
  /** Internal: prevent infinite retry loop. */
  _reauthRetried?: boolean;
};

/**
 * Browser API client — Bearer token only (no HttpOnly cookie).
 * Aligns with accessToken in login/register body (Nest also returns this field).
 */
export const api: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const cfg = config as ApiRequestConfig;
  if (!cfg.skipAuthHeader) {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  const url = config.url ?? "";
  if (url.includes("/codesim/sessions/")) {
    const clientToken = getOrCreateClientToken();
    if (clientToken) {
      config.headers["X-Codesim-Client-Token"] = clientToken;
    }
  }
  return config;
});

let authRedirectInFlight = false;

function shouldHandleSessionExpired(requestUrl?: string, config?: ApiRequestConfig): boolean {
  if (typeof window === "undefined") return false;
  if (config?.skipSessionReauth) return false;
  const path = window.location.pathname;
  if (path.startsWith("/login") || path.startsWith("/register")) return false;
  if (path.startsWith("/learn/simulation")) return false;
  const url = requestUrl ?? "";
  if (url.includes("/codesim/")) return false;
  if (
    url.includes("/auth/login") ||
    url.includes("/auth/register") ||
    url.includes("/auth/reauth")
  ) {
    return false;
  }
  return true;
}

function redirectToLogin(): void {
  if (authRedirectInFlight) return;
  authRedirectInFlight = true;
  clearProfileHint();
  clearClientSession();
  const path = window.location.pathname;
  window.location.replace(`/login?next=${encodeURIComponent(path)}`);
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
    if (isRateLimitError(error)) {
      notifyRateLimitOnce(toApiError(error).message);
    }

    const config = error.config as ApiRequestConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      shouldHandleSessionExpired(config?.url, config) &&
      getAccessToken() &&
      !isTenantContextApiError(error)
    ) {
      if (!config?._reauthRetried) {
        const ok = await requestSessionReauth();
        if (ok && config) {
          const retryConfig: ApiRequestConfig = {
            ...config,
            _reauthRetried: true,
            headers: config.headers ?? {},
          };
          retryConfig.headers.Authorization = `Bearer ${getAccessToken()}`;
          return api.request(retryConfig);
        }
      }
      redirectToLogin();
      return Promise.reject(error);
    }

    if (
      status === 401 &&
      shouldHandleSessionExpired(config?.url, config) &&
      !getAccessToken()
    ) {
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);
