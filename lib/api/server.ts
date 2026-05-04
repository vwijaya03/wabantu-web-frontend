import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { AnalyticsOverview } from "./analytics";
import type { AuthUser } from "./auth";
import type { BusinessProfile } from "./business";
import type { WhatsappChannel } from "./whatsapp";

/**
 * Fetch the current user using cookies forwarded from the incoming request.
 * Used by server components in the (dashboard) route group to redirect
 * unauthenticated visitors before any UI renders.
 *
 * Returns null on any failure — caller decides whether to redirect.
 */
export async function getServerUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await fetch(`${env.apiUrlInternal}/auth/me`, {
      headers: {
        cookie: cookieHeader,
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as
      | { success?: boolean; data?: AuthUser }
      | AuthUser;
    if (json && typeof json === "object" && "success" in json && json.success) {
      return (json.data ?? null) as AuthUser | null;
    }
    return json as AuthUser;
  } catch {
    return null;
  }
}

/**
 * Fetch WhatsApp channels for the current authenticated tenant.
 * Returns [] on failure so dashboard widgets can degrade gracefully.
 */
export async function getServerWhatsappChannels(): Promise<WhatsappChannel[]> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await fetch(`${env.apiUrlInternal}/whatsapp/channels`, {
      headers: {
        cookie: cookieHeader,
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as
      | { success?: boolean; data?: WhatsappChannel[] }
      | WhatsappChannel[];
    if (json && typeof json === "object" && "success" in json && json.success) {
      return (json.data ?? []) as WhatsappChannel[];
    }
    return Array.isArray(json) ? json : [];
  } catch {
    return [];
  }
}

/**
 * Analytics overview for dashboard summary cards (same contract as GET /analytics/overview).
 */
export async function getServerAnalyticsOverview(
  days = 30,
): Promise<AnalyticsOverview | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const q = new URLSearchParams({ days: String(days) });
    const res = await fetch(
      `${env.apiUrlInternal}/analytics/overview?${q.toString()}`,
      {
        headers: {
          cookie: cookieHeader,
          accept: "application/json",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as
      | { success?: boolean; data?: AnalyticsOverview }
      | AnalyticsOverview;
    if (json && typeof json === "object" && "success" in json && json.success) {
      return (json.data ?? null) as AnalyticsOverview | null;
    }
    return json as AnalyticsOverview;
  } catch {
    return null;
  }
}

/**
 * Current tenant business profile (GET /business/profile).
 * Returns null on failure (e.g. not logged in).
 */
export async function getServerBusinessProfile(): Promise<BusinessProfile | null> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await fetch(`${env.apiUrlInternal}/business/profile`, {
      headers: {
        cookie: cookieHeader,
        accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as
      | { success?: boolean; data?: BusinessProfile }
      | BusinessProfile;
    if (json && typeof json === "object" && "success" in json && json.success) {
      return (json.data ?? null) as BusinessProfile | null;
    }
    if (
      json &&
      typeof json === "object" &&
      "businessName" in json &&
      typeof (json as BusinessProfile).businessName === "string"
    ) {
      return json as BusinessProfile;
    }
    return null;
  } catch {
    return null;
  }
}

/** Total FAQ entries for the tenant (from list metadata). */
export async function getServerKnowledgeBaseTotal(): Promise<number> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const q = new URLSearchParams({ page: "1", pageSize: "1" });
    const res = await fetch(
      `${env.apiUrlInternal}/knowledge-base?${q.toString()}`,
      {
        headers: {
          cookie: cookieHeader,
          accept: "application/json",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return 0;
    const json = (await res.json()) as
      | { success?: boolean; data?: { total?: number } }
      | { total?: number };
    if (json && typeof json === "object" && "success" in json && json.success) {
      const t = json.data?.total;
      return typeof t === "number" ? t : 0;
    }
    if (json && typeof json === "object" && "total" in json) {
      const t = (json as { total?: number }).total;
      return typeof t === "number" ? t : 0;
    }
    return 0;
  } catch {
    return 0;
  }
}
