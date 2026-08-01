import type { Metadata } from "next";
import {
  buildJadwalPageUrl,
  buildPublicPatientScheduleTitle,
  fetchPublicPatientSchedule,
} from "@/lib/server/public-event";

type Props = {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
  children: React.ReactNode;
};

const JADWAL_FALLBACK_TITLE = "Jadwal Pasien";
const JADWAL_FALLBACK_DESCRIPTION = "Jadwal pasien terjadwal.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenantSlug, eventSlug } = await params;
  const schedule = await fetchPublicPatientSchedule(tenantSlug, eventSlug);
  const pageUrl = buildJadwalPageUrl(tenantSlug, eventSlug);

  if (!schedule?.eventName?.trim()) {
    return {
      title: { absolute: JADWAL_FALLBACK_TITLE },
      description: JADWAL_FALLBACK_DESCRIPTION,
      openGraph: {
        title: JADWAL_FALLBACK_TITLE,
        description: JADWAL_FALLBACK_DESCRIPTION,
        type: "website",
        ...(pageUrl ? { url: pageUrl } : {}),
      },
      twitter: {
        card: "summary",
        title: JADWAL_FALLBACK_TITLE,
        description: JADWAL_FALLBACK_DESCRIPTION,
      },
    };
  }

  const title = buildPublicPatientScheduleTitle(schedule.eventName);
  const description = `Jadwal pasien terjadwal — ${title}`;

  return {
    title: { absolute: title },
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(pageUrl ? { url: pageUrl } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function PublicPatientScheduleLayout({ children }: Props) {
  return children;
}
