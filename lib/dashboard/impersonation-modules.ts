import type { NavSection } from "@/lib/dashboard/nav-config";
import { sectionLinks } from "@/lib/dashboard/nav-config";

export const IMPERSONATION_MODULE_OPTIONS = [
  { id: "main", label: "Utama (Overview, Inbox, Contacts)" },
  { id: "sales", label: "Penjualan (Katalog, Pesanan, Broadcast)" },
  { id: "inventory", label: "Persediaan" },
  { id: "finance", label: "Keuangan & Billing" },
  { id: "ai", label: "AI & Channel" },
  { id: "org", label: "Organisasi (Team, Import, Analytics, Acara)" },
  { id: "advanced", label: "Lanjutan (Cabang, Workflow)" },
] as const;

export type ImpersonationModuleId = (typeof IMPERSONATION_MODULE_OPTIONS)[number]["id"];

const PATH_PREFIX_TO_MODULE: { prefix: string; moduleId: ImpersonationModuleId }[] = [
  { prefix: "/dashboard/inbox", moduleId: "main" },
  { prefix: "/dashboard/contacts", moduleId: "main" },
  { prefix: "/dashboard/catalog", moduleId: "sales" },
  { prefix: "/dashboard/orders", moduleId: "sales" },
  { prefix: "/dashboard/broadcast", moduleId: "sales" },
  { prefix: "/dashboard/inventory", moduleId: "inventory" },
  { prefix: "/dashboard/finance", moduleId: "finance" },
  { prefix: "/dashboard/billing", moduleId: "finance" },
  { prefix: "/dashboard/ai-settings", moduleId: "ai" },
  { prefix: "/dashboard/knowledge-base", moduleId: "ai" },
  { prefix: "/dashboard/whatsapp", moduleId: "ai" },
  { prefix: "/dashboard/team", moduleId: "org" },
  { prefix: "/dashboard/import", moduleId: "org" },
  { prefix: "/dashboard/analytics", moduleId: "org" },
  { prefix: "/dashboard/events", moduleId: "org" },
  { prefix: "/dashboard/access-requests", moduleId: "org" },
  { prefix: "/dashboard/branches", moduleId: "advanced" },
  { prefix: "/dashboard/workflow", moduleId: "advanced" },
];

/** Map dashboard path to impersonation module id. Overview `/dashboard` → main. */
export function pathToModuleId(pathname: string): ImpersonationModuleId | null {
  if (pathname === "/dashboard") return "main";
  const match = PATH_PREFIX_TO_MODULE.find(
    (entry) =>
      pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  return match?.moduleId ?? null;
}

export function hasFullImpersonationAccess(modules?: string[] | null): boolean {
  return !modules || modules.length === 0;
}

export function isPathAllowedForModules(
  pathname: string,
  modules?: string[] | null,
): boolean {
  if (hasFullImpersonationAccess(modules)) return true;
  const moduleId = pathToModuleId(pathname);
  if (!moduleId) return true;
  return modules!.includes(moduleId);
}

export function filterNavSectionsByModules(
  sections: NavSection[],
  modules?: string[] | null,
): NavSection[] {
  if (hasFullImpersonationAccess(modules)) return sections;

  return sections
    .map((section) => {
      if (!modules!.includes(section.id)) return null;
      return section;
    })
    .filter((section): section is NavSection => section !== null);
}

export function formatImpersonationScope(
  scope?: string | null,
  modules?: string[] | null,
): string {
  if (!scope || scope === "full" || hasFullImpersonationAccess(modules)) {
    return "Akses penuh";
  }
  const labels = IMPERSONATION_MODULE_OPTIONS.filter((opt) =>
    modules?.includes(opt.id),
  ).map((opt) => opt.label.split(" (")[0]);
  return labels.length > 0 ? `Terbatas: ${labels.join(", ")}` : "Terbatas";
}

export function formatAccessExpiry(expiresAt?: string | null): string {
  if (!expiresAt) return "Permanen sampai dicabut";
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export const ACCESS_DURATION_OPTIONS = [
  { label: "24 jam", hours: 24 },
  { label: "7 hari", hours: 168 },
  { label: "30 hari", hours: 720 },
  { label: "Permanen (sampai dicabut)", hours: null },
] as const;

export function accessStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Menunggu persetujuan";
    case "approved":
      return "Disetujui";
    case "rejected":
      return "Ditolak";
    case "revoked":
      return "Dicabut";
    case "expired":
      return "Kedaluwarsa";
    default:
      return status;
  }
}

/** Labels for nav links outside standard sections (e.g. access-requests). */
export function moduleLabelsForPaths(sections: NavSection[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const section of sections) {
    for (const link of sectionLinks(section)) {
      map.set(link.href, link.label);
    }
  }
  return map;
}
