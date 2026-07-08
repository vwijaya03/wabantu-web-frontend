import type { Metadata } from "next";
import {
  buildPublicEventDescription,
  fetchPublicEventRegistration,
} from "@/lib/server/public-event";

type Props = {
  params: Promise<{ tenantSlug: string; eventSlug: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenantSlug, eventSlug } = await params;
  const event = await fetchPublicEventRegistration(tenantSlug, eventSlug);

  if (!event?.eventName?.trim()) {
    return {
      title: "Pendaftaran pasien",
      description: "Form pendaftaran pasien terapi.",
    };
  }

  const title = event.eventName.trim();
  const description = buildPublicEventDescription(event);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function PublicRegisterLayout({ children }: Props) {
  return children;
}
