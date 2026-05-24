import type { QuotaItem } from "@/lib/api/usage";

export type QuotaDisplayMeta = {
  label: string;
  description: string;
  unit?: string;
  formatValue?: (n: number) => string;
  /** Hide from main panel when limit is 0 and not meaningful */
  hideWhenZeroLimit?: boolean;
};

const QUOTA_META: Record<string, QuotaDisplayMeta> = {
  ai_conversation: {
    label: "Percakapan AI",
    description: "Percakapan yang diproses AI auto-reply bulan ini.",
  },
  ai_token: {
    label: "Token AI",
    description: "Kuota penggunaan AI (chat, import gambar, dll.).",
    formatValue: (n) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)} jt` : n.toLocaleString("id-ID")),
  },
  broadcast_contact: {
    label: "Kontak broadcast (platform)",
    description:
      "Batas penerima kampanye di WABantu per bulan. Bukan tagihan Meta — pesan promosi resmi Meta ditagih terpisah di Business Manager.",
    hideWhenZeroLimit: true,
  },
  workflow_exec: {
    label: "Workflow",
    description: "Eksekusi rule kata kunci (automasi sebelum AI).",
    hideWhenZeroLimit: true,
  },
  admin_seat: {
    label: "Seat staff",
    description: "Jumlah kursi tim yang diizinkan paket.",
  },
  storage_byte: {
    label: "Penyimpanan",
    description: "File/media yang disimpan.",
    formatValue: formatBytes,
  },
};

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getQuotaMeta(eventType: string): QuotaDisplayMeta {
  return (
    QUOTA_META[eventType] ?? {
      label: eventType,
      description: "Pemakaian bulan ini.",
    }
  );
}

export function formatQuotaUsed(item: QuotaItem, meta: QuotaDisplayMeta): string {
  const fmt = meta.formatValue ?? ((n: number) => n.toLocaleString("id-ID"));
  return fmt(item.used);
}

export function formatQuotaLimit(item: QuotaItem, meta: QuotaDisplayMeta): string {
  if (item.limit === 0) return "Tidak termasuk paket";
  if (item.limit < 0) return "∞";
  const fmt = meta.formatValue ?? ((n: number) => n.toLocaleString("id-ID"));
  return fmt(item.limit);
}

export function quotaPercentUsed(item: QuotaItem): number {
  if (item.limit <= 0) return 0;
  return Math.min(100, Math.round((item.used / item.limit) * 100));
}

export function quotaStatus(item: QuotaItem): "ok" | "warn" | "exhausted" {
  if (item.limit <= 0) return "ok";
  if (item.remaining <= 0) return "exhausted";
  if (item.used / item.limit >= 0.8) return "warn";
  return "ok";
}

/** Stable order for dashboard */
export const QUOTA_DISPLAY_ORDER = [
  "ai_conversation",
  "ai_token",
  "broadcast_contact",
  "workflow_exec",
  "admin_seat",
  "storage_byte",
] as const;
