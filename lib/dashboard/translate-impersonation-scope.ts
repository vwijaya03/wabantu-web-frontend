import {
  IMPERSONATION_MODULE_OPTIONS,
  hasFullImpersonationAccess,
} from "@/lib/dashboard/impersonation-modules";

export function translateImpersonationScope(
  t: (source: string, vars?: Record<string, string | number>) => string,
  scope?: string | null,
  modules?: string[] | null,
): string {
  if (!scope || scope === "full" || hasFullImpersonationAccess(modules)) {
    return t("Akses penuh");
  }
  const labels = IMPERSONATION_MODULE_OPTIONS.filter((opt) =>
    modules?.includes(opt.id),
  ).map((opt) => t(opt.label.split(" (")[0]));
  return labels.length > 0
    ? t("Terbatas: {labels}", { labels: labels.join(", ") })
    : t("Terbatas");
}

export function translateAccessExpiry(
  t: (source: string) => string,
  expiresAt?: string | null,
  formatted?: string,
): string {
  if (!expiresAt) return t("Permanen sampai dicabut");
  return formatted ?? "—";
}

export function translateAccessStatus(
  t: (source: string) => string,
  status: string,
): string {
  return t(
    {
      pending: "Menunggu persetujuan",
      approved: "Disetujui",
      rejected: "Ditolak",
      revoked: "Dicabut",
      expired: "Kedaluwarsa",
    }[status] ?? status,
  );
}
