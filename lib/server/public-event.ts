import type { PublicEventInfo, PublicStaffMonitorResponse } from "@/lib/api/events";
import { formatEventDateTimeRange } from "@/lib/events-format";
import { env } from "@/lib/env";

type ApiEnvelope<T> = { success?: boolean; data?: T };

function unwrapApiEnvelope<T>(json: ApiEnvelope<T> | T): T | null {
  if (json && typeof json === "object" && "data" in json && (json as ApiEnvelope<T>).success === true) {
    return (json as ApiEnvelope<T>).data ?? null;
  }
  return (json as T) ?? null;
}

/** Human-readable tenant label from URL slug (e.g. omah_apparel → Omah Apparel). */
export function formatTenantDisplayName(tenantSlug: string): string {
  return tenantSlug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function buildPublicMonitorTitle(eventName: string, tenantSlug: string): string {
  const tenantLabel = formatTenantDisplayName(tenantSlug);
  return `Monitor Staf — ${eventName.trim()} | ${tenantLabel}`;
}

export function buildPublicMonitorDescription(
  event: Pick<
    PublicStaffMonitorResponse,
    "location" | "startDate" | "endDate" | "startTime" | "endTime"
  >,
): string {
  const base = "Pantau kehadiran staf dan relawan acara secara real-time.";
  const parts: string[] = [];
  const when = formatEventDateTimeRange(
    event.startDate,
    event.startTime,
    event.endDate,
    event.endTime,
  );
  if (when !== "—") parts.push(when);
  if (event.location?.trim()) {
    parts.push(event.location.trim());
  }
  return parts.length > 0 ? `${base} ${parts.join(" · ")}` : base;
}

export function buildMonitorPageUrl(tenantSlug: string, eventSlug: string): string | undefined {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (!base) return undefined;
  return `${base}/monitor/${encodeURIComponent(tenantSlug)}/${encodeURIComponent(eventSlug)}`;
}

/** Server-only fetch for OG metadata (WhatsApp link preview). */
export async function fetchPublicEventRegistration(
  tenantSlug: string,
  eventSlug: string,
): Promise<PublicEventInfo | null> {
  const url = `${env.apiUrlInternal}/public/events/${encodeURIComponent(tenantSlug)}/register/${encodeURIComponent(eventSlug)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json: ApiEnvelope<PublicEventInfo> | PublicEventInfo = await res.json();
    return unwrapApiEnvelope(json);
  } catch {
    return null;
  }
}

/** Server-only fetch for OG metadata on public staff monitor page. */
export async function fetchPublicStaffMonitor(
  tenantSlug: string,
  eventSlug: string,
): Promise<PublicStaffMonitorResponse | null> {
  const url = `${env.apiUrlInternal}/public/events/${encodeURIComponent(tenantSlug)}/monitor/${encodeURIComponent(eventSlug)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const json: ApiEnvelope<PublicStaffMonitorResponse> | PublicStaffMonitorResponse =
      await res.json();
    return unwrapApiEnvelope(json);
  } catch {
    return null;
  }
}

export function buildPublicEventDescription(event: PublicEventInfo): string {
  const parts = ["Pendaftaran pasien terapi"];
  if (event.location?.trim()) parts.push(event.location.trim());
  const when = formatEventDateTimeRange(
    event.startDate,
    event.startTime,
    event.endDate,
    event.endTime,
  );
  if (when !== "—") parts.push(when);
  return parts.join(" · ");
}
