import { api } from "./client";
import { apiGetConfig } from "./read-options";
import { DEFAULT_REPORTING_TIMEZONE_UI } from "@/lib/reporting-timezones";

/** Accept camelCase or snake_case; prefer first non-empty (avoid `"" ?? snake` ignoring snake). */
function pickReportingTimezonePayload(data: unknown): string {
  if (!data || typeof data !== "object") return DEFAULT_REPORTING_TIMEZONE_UI;
  const o = data as Record<string, unknown>;
  const candidates = [o.reportingTimezone, o.reporting_timezone];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c.trim();
  }
  return DEFAULT_REPORTING_TIMEZONE_UI;
}

function withNormalizedTimezone<T extends object>(data: T): T & { reportingTimezone: string } {
  return {
    ...data,
    reportingTimezone: pickReportingTimezonePayload(data),
  };
}

/** api-go returns `{ profile }`; Nest returns a flat object — accept both. */
function unwrapProfilePayload(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const o = data as Record<string, unknown>;
  if (o.profile && typeof o.profile === "object") {
    return o.profile as Record<string, unknown>;
  }
  return o;
}

function strField(o: Record<string, unknown>, camel: string, snake: string): string {
  const v = o[camel] ?? o[snake];
  return typeof v === "string" ? v : "";
}

function nullableStrField(
  o: Record<string, unknown>,
  camel: string,
  snake: string,
): string | null {
  const v = o[camel] ?? o[snake];
  if (v == null) return null;
  return typeof v === "string" ? v : null;
}

function numField(o: Record<string, unknown>, camel: string, snake: string, fallback: number): number {
  const v = o[camel] ?? o[snake];
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return fallback;
}

function normalizeProfile(data: unknown): BusinessProfile {
  const o = unwrapProfilePayload(data);
  const toneRaw = o.tone;
  const tone =
    toneRaw === "formal" || toneRaw === "casual" ? toneRaw : "friendly";

  return withNormalizedTimezone({
    id: strField(o, "id", "id"),
    businessName: strField(o, "businessName", "business_name"),
    description: nullableStrField(o, "description", "description"),
    address: nullableStrField(o, "address", "address"),
    openingHours: nullableStrField(o, "openingHours", "opening_hours"),
    productsServices: nullableStrField(o, "productsServices", "products_services"),
    basePricing: nullableStrField(o, "basePricing", "base_pricing"),
    deliveryArea: nullableStrField(o, "deliveryArea", "delivery_area"),
    greetingTemplate: nullableStrField(o, "greetingTemplate", "greeting_template"),
    tone,
    aiEnabled: o.aiEnabled !== false && o.ai_enabled !== false,
    paymentVerificationMode:
      strField(o, "paymentVerificationMode", "payment_verification_mode") === "auto_verify"
        ? "auto_verify"
        : "manual",
    paymentAutoVerifyMinConfidence: numField(
      o,
      "paymentAutoVerifyMinConfidence",
      "payment_auto_verify_min_confidence",
      0.95,
    ),
  });
}

export interface BusinessProfile {
  id: string;
  businessName: string;
  description: string | null;
  address: string | null;
  openingHours: string | null;
  productsServices: string | null;
  basePricing: string | null;
  deliveryArea: string | null;
  greetingTemplate: string | null;
  tone: "friendly" | "formal" | "casual";
  aiEnabled: boolean;
  /** manual = owner verifikasi bukti; auto_verify = OCR + aturan KB. */
  paymentVerificationMode: "manual" | "auto_verify";
  paymentAutoVerifyMinConfidence: number;
  /** IANA timezone for dashboard “hari ini” (analytics). */
  reportingTimezone: string;
}

export type UpdateBusinessProfileInput = Partial<
  Omit<BusinessProfile, "id">
>;

export type ProfileAISuggestField = "description" | "productsServices";

export interface ProfileAISuggestResult {
  field: ProfileAISuggestField;
  suggestion: string;
  tokensUsed: number;
  tokenQuotaRemaining: number;
  tokenQuotaLimit: number;
  quotaNotice: string;
}

export const businessApi = {
  async get(signal?: AbortSignal): Promise<BusinessProfile> {
    const res = await api.get<unknown>("/business/profile", apiGetConfig(undefined, signal));
    return normalizeProfile(res.data);
  },
  async update(input: UpdateBusinessProfileInput): Promise<BusinessProfile> {
    const res = await api.patch<unknown>("/business/profile", input);
    return normalizeProfile(res.data);
  },
  async suggestField(input: {
    field: ProfileAISuggestField;
    hint?: string;
  }): Promise<ProfileAISuggestResult> {
    const res = await api.post<ProfileAISuggestResult>("/business/profile/ai-suggest", input, {
      timeout: 90_000,
    });
    return res.data;
  },
};
