import { toast } from "sonner";
import { toApiError, type ApiError } from "@/lib/api/errors";

/** Matches api-go middleware message; shown when API does not return a body. */
export const RATE_LIMIT_USER_MESSAGE =
  "Terlalu banyak permintaan ke server. Tunggu sekitar satu menit, lalu coba lagi.";

const RATE_LIMIT_TOAST_ID = "wabantu-rate-limit";

let lastToastAt = 0;
const TOAST_COOLDOWN_MS = 8_000;

export function isRateLimitError(err: unknown): boolean {
  const api = toApiError(err);
  if (api.status === 429) return true;
  if (api.code === "resource_exhausted") return true;
  return /too many requests/i.test(api.message);
}

export function rateLimitTitle(): string {
  return "Batas permintaan tercapai";
}

/** User-facing copy for inline UI (cards, banners). */
export function rateLimitDetail(api?: ApiError): string {
  if (
    api?.message &&
    (api.status === 429 || /too many requests|coba lagi/i.test(api.message))
  ) {
    return api.message;
  }
  return RATE_LIMIT_USER_MESSAGE;
}

export function formatQueryError(err: unknown): { title: string; detail: string } {
  const api = toApiError(err);
  if (isRateLimitError(err)) {
    return { title: rateLimitTitle(), detail: rateLimitDetail(api) };
  }
  return {
    title: "Gagal memuat data",
    detail: api.message || "Terjadi kesalahan. Coba lagi.",
  };
}

/** Debounced Sonner toast so many parallel 429s do not flood the UI. */
export function notifyRateLimitOnce(message?: string): void {
  const now = Date.now();
  if (now - lastToastAt < TOAST_COOLDOWN_MS) return;
  lastToastAt = now;
  toast.error(rateLimitTitle(), {
    id: RATE_LIMIT_TOAST_ID,
    description: message ?? RATE_LIMIT_USER_MESSAGE,
    duration: 10_000,
  });
}
