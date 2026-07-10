import type { Metadata } from "next";
import {
  buildMonitorPageUrl,
  buildPublicMonitorDescription,
  buildPublicMonitorTitle,
  fetchPublicStaffMonitor,
} from "@/lib/server/public-event";

type Props = {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
  children: React.ReactNode;
};

const MONITOR_FALLBACK_TITLE = "Monitor Staf Acara";
const MONITOR_FALLBACK_DESCRIPTION =
  "Pantau kehadiran staf dan relawan acara secara real-time.";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenantSlug, eventSlug } = await params;
  const monitor = await fetchPublicStaffMonitor(tenantSlug, eventSlug);
  const pageUrl = buildMonitorPageUrl(tenantSlug, eventSlug);

  if (!monitor?.eventName?.trim()) {
    return {
      title: { absolute: MONITOR_FALLBACK_TITLE },
      description: MONITOR_FALLBACK_DESCRIPTION,
      openGraph: {
        title: MONITOR_FALLBACK_TITLE,
        description: MONITOR_FALLBACK_DESCRIPTION,
        type: "website",
        ...(pageUrl ? { url: pageUrl } : {}),
      },
      twitter: {
        card: "summary",
        title: MONITOR_FALLBACK_TITLE,
        description: MONITOR_FALLBACK_DESCRIPTION,
      },
    };
  }

  const title = buildPublicMonitorTitle(monitor.eventName, tenantSlug);
  const description = buildPublicMonitorDescription(monitor);

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

export default function PublicStaffMonitorLayout({ children }: Props) {
  return children;
}
