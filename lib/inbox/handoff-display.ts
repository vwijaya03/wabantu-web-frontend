/** Badge + keterangan singkat alasan handoff inbox (tanpa field API baru). */

export type InboxHandoffBadgeVariant = "success" | "warning";

export type InboxHandoffDisplay = {
  badgeLabel: string;
  badgeVariant: InboxHandoffBadgeVariant;
  /** Keterangan pendek; null jika tidak perlu ditampilkan (mis. AI agent). */
  description: string | null;
};

type HandoffReasonInput = {
  aiHandled: boolean;
  handoffReason: string | null;
};

const KNOWN_HANDOFF: Record<string, { label: string; description: string }> = {
  buyer_requested_human: {
    label: "Ingin dibantu tim",
    description: "Pembeli meminta bantuan staf.",
  },
  "Sensitive/escalate detected": {
    label: "Tim CS menangani",
    description: "Topik sensitif — tim CS mengambil alih.",
  },
  "Auto fallback setelah retry AI gagal": {
    label: "Tim CS menangani",
    description: "Balasan AI gagal — staf melanjutkan chat.",
  },
  workflow: {
    label: "Handoff alur",
    description: "Dipindah ke staf oleh alur otomatis.",
  },
  image_unhandled: {
    label: "Handoff gambar",
    description: "Gambar belum bisa ditangani AI.",
  },
  "Diambil alih manual oleh staff": {
    label: "Handoff",
    description: "Staf mengambil alih percakapan.",
  },
  "Takeover manual dari inbox": {
    label: "Handoff",
    description: "Diambil alih manual dari inbox.",
  },
};

const HTML_TAG = /<[^>]*>/;

/** Tampilkan alasan mentah hanya jika aman (tanpa markup HTML). */
export function sanitizeHandoffReasonForDisplay(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (HTML_TAG.test(trimmed)) return null;
  if (trimmed.length > 200) return `${trimmed.slice(0, 197)}…`;
  return trimmed;
}

export function getInboxHandoffDisplay(input: HandoffReasonInput): InboxHandoffDisplay {
  if (input.aiHandled) {
    return {
      badgeLabel: "AI agent",
      badgeVariant: "success",
      description: null,
    };
  }

  const reason = input.handoffReason?.trim() ?? "";
  const known = reason ? KNOWN_HANDOFF[reason] : undefined;
  if (known) {
    return {
      badgeLabel: known.label,
      badgeVariant: "warning",
      description: known.description,
    };
  }

  const safeRaw = sanitizeHandoffReasonForDisplay(reason);
  return {
    badgeLabel: "Handoff",
    badgeVariant: "warning",
    description: safeRaw,
  };
}
