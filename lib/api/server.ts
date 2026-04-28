import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { AuthUser } from "./auth";
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
