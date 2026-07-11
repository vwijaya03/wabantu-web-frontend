import type { PaymentStatus } from "@/lib/api/orders";

const PAYMENT_PROOF_FLAG_LABELS: Record<string, string> = {
  ai_review_required: "Auto-verify gagal — pembayaran perlu dicek manual",
  ocr_failed: "OCR tidak bisa membaca bukti transfer",
  low_confidence: "Keyakinan OCR di bawah batas auto-verify",
  mismatch_amount: "Nominal transfer tidak sesuai total pesanan",
  account_mismatch: "Rekening tujuan tidak cocok dengan FAQ toko",
  missing_amount: "Nominal transfer tidak terdeteksi",
  invalid_date: "Tanggal transfer mencurigakan",
  kb_empty: "FAQ rekening toko belum lengkap",
  multi_order: "Ada lebih dari satu pesanan belum dibayar",
  duplicate_hash: "Screenshot sama sudah dipakai untuk pesanan lain",
  quota_exceeded: "Kuota AI habis — verifikasi manual",
};

const DOUBT_FLAGS = new Set(Object.keys(PAYMENT_PROOF_FLAG_LABELS));

export function formatPaymentProofFlag(flag: string): string {
  return PAYMENT_PROOF_FLAG_LABELS[flag] ?? flag.replaceAll("_", " ");
}

export function formatPaymentProofFlags(flags?: string[]): string[] {
  if (!flags?.length) return [];
  return flags.map(formatPaymentProofFlag);
}

export function isPaymentProofDoubtful(
  status?: PaymentStatus | string,
  flags?: string[],
): boolean {
  if ((status ?? "unpaid") !== "proof_submitted") return false;
  return (flags ?? []).some((f) => DOUBT_FLAGS.has(f));
}

export function paymentProofDoubtSummary(flags?: string[]): string | null {
  if (!flags?.length) return null;
  const labels = formatPaymentProofFlags(flags.filter((f) => DOUBT_FLAGS.has(f)));
  return labels.length > 0 ? labels.join(" · ") : null;
}

export function paymentProofListBadgeLabel(status?: string, flags?: string[]): string {
  if (isPaymentProofDoubtful(status, flags)) return "Diragukan AI";
  if ((status ?? "unpaid") === "proof_submitted") return "Perlu dicek";
  return status ?? "unpaid";
}

export function paymentProofPanelHint(status?: string, flags?: string[]): string {
  if (isPaymentProofDoubtful(status, flags)) {
    return "Bukti transfer masuk, tetapi OCR/AI tidak yakin — verifikasi manual diperlukan.";
  }
  if ((status ?? "unpaid") === "proof_submitted") {
    return "Bukti transfer sudah masuk — verifikasi atau tolak.";
  }
  return "Status pembayaran berdasarkan bukti transfer dari pelanggan.";
}
