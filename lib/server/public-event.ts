import type { PublicEventInfo } from "@/lib/api/events";
import { env } from "@/lib/env";

type ApiEnvelope<T> = { success?: boolean; data?: T };

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
    if (json && typeof json === "object" && "data" in json && json.success === true) {
      return json.data ?? null;
    }
    return json as PublicEventInfo;
  } catch {
    return null;
  }
}

export function buildPublicEventDescription(event: PublicEventInfo): string {
  const parts = ["Pendaftaran pasien terapi"];
  if (event.location?.trim()) parts.push(event.location.trim());
  if (event.startDate && event.endDate) {
    parts.push(`${event.startDate} — ${event.endDate}`);
  } else if (event.startDate) {
    parts.push(event.startDate);
  }
  return parts.join(" · ");
}
