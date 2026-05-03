import { api } from "./client";
import { DEFAULT_REPORTING_TIMEZONE_UI } from "@/lib/reporting-timezones";

function normalizeReportingTimezone(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_REPORTING_TIMEZONE_UI;
  const t = raw.trim();
  return t.length > 0 ? t : DEFAULT_REPORTING_TIMEZONE_UI;
}

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
  /** IANA timezone for dashboard “hari ini” (analytics). */
  reportingTimezone: string;
}

export type UpdateBusinessProfileInput = Partial<
  Omit<BusinessProfile, "id">
>;

export const businessApi = {
  async get(): Promise<BusinessProfile> {
    const res = await api.get<BusinessProfile>("/business/profile");
    return withNormalizedTimezone(res.data);
  },
  async update(input: UpdateBusinessProfileInput): Promise<BusinessProfile> {
    const res = await api.patch<BusinessProfile>("/business/profile", input);
    return withNormalizedTimezone(res.data);
  },
};
