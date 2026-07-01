"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { inboxApi } from "@/lib/api/inbox";
import type { Order } from "@/lib/api/orders";
import { cn } from "@/lib/utils";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(
    value,
  );
}

export const PAYMENT_STATUSES = [
  {
    value: "unpaid",
    badge: "Belum ada bukti",
    filter: "Belum ada bukti transfer",
    hint: "Pelanggan belum mengirim screenshot bukti transfer.",
  },
  {
    value: "proof_submitted",
    badge: "Perlu dicek",
    filter: "Bukti perlu dicek",
    hint: "Bukti transfer sudah masuk — verifikasi atau tolak.",
  },
  {
    value: "verified",
    badge: "Sudah dibayar",
    filter: "Pembayaran sudah OK",
    hint: "Bukti transfer sudah diverifikasi.",
  },
  {
    value: "rejected",
    badge: "Bukti ditolak",
    filter: "Bukti transfer ditolak",
    hint: "Bukti transfer ditolak. Minta pelanggan kirim bukti yang benar.",
  },
] as const;

export function paymentStatusMeta(status?: string) {
  const s = status ?? "unpaid";
  return PAYMENT_STATUSES.find((o) => o.value === s);
}

export function paymentStatusBadgeLabel(status?: string) {
  return paymentStatusMeta(status)?.badge ?? (status ?? "unpaid");
}

export function paymentStatusHint(status?: string) {
  return paymentStatusMeta(status)?.hint ?? "Status pembayaran berdasarkan bukti transfer dari pelanggan.";
}

export function paymentStatusBadgeVariant(status?: string) {
  switch (status ?? "unpaid") {
    case "verified":
      return "success" as const;
    case "proof_submitted":
      return "warning" as const;
    case "rejected":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function paymentStatusBannerClass(status?: string) {
  switch (status ?? "unpaid") {
    case "verified":
      return "border-green-500/30 bg-green-500/5";
    case "proof_submitted":
      return "border-amber-500/30 bg-amber-500/5";
    case "rejected":
      return "border-destructive/40 bg-destructive/5";
    default:
      return "border-border bg-muted/30";
  }
}

function hasPaymentMetaContent(order: Order) {
  const meta = order.paymentProofMeta;
  if (!meta) return false;
  return (
    meta.amount != null ||
    Boolean(meta.bank) ||
    Boolean(meta.accountNumber) ||
    (meta.confidence != null && meta.confidence > 0) ||
    (meta.flags != null && meta.flags.length > 0)
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{children}</p>
    </div>
  );
}

function OrderProofImage({ messageId }: { messageId: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    void inboxApi
      .fetchMessageMediaBlob(messageId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [messageId]);

  if (failed) return <p className="text-xs text-muted-foreground">Gagal memuat bukti</p>;
  if (!src) return <p className="text-xs text-muted-foreground">Memuat bukti…</p>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- blob from auth API
    <img src={src} alt="Bukti transfer" className="max-h-56 w-full rounded-md border object-contain" />
  );
}

export function PaymentProofPanel({
  order,
  canManage,
  verifyPending,
  rejectPending,
  unblockPending,
  onVerify,
  onReject,
  onUnblock,
}: {
  order: Order;
  canManage: boolean;
  verifyPending: boolean;
  rejectPending: boolean;
  unblockPending?: boolean;
  onVerify: () => void;
  onReject: () => void;
  onUnblock?: () => void;
}) {
  const status = order.paymentStatus ?? "unpaid";
  const meta = order.paymentProofMeta;
  const hasProof = Boolean(order.paymentProofMessageId);
  const proofBlocked = Boolean(meta?.proofBlocked);
  const rejectionCount = meta?.rejectionCount ?? 0;
  const maxRejections = 5;

  const showVerifyReject = canManage && status === "proof_submitted" && hasProof;
  const showReverify = canManage && status === "rejected" && hasProof;
  const showUnblock = canManage && proofBlocked && onUnblock != null;
  const showMeta = hasPaymentMetaContent(order);

  return (
    <div className="mb-6 rounded-lg border p-4">
      <div className={cn("rounded-lg border px-4 py-3", paymentStatusBannerClass(status))}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">Bukti transfer</p>
          <Badge variant={paymentStatusBadgeVariant(status)}>{paymentStatusBadgeLabel(status)}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{paymentStatusHint(status)}</p>
        {proofBlocked ? (
          <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Upload bukti dari pembeli diabaikan ({rejectionCount}/{maxRejections} penolakan)
            </p>
            <p className="mt-1 text-muted-foreground">
              Buka batas jika ingin menerima bukti transfer lagi dari pelanggan.
            </p>
          </div>
        ) : null}
        {status === "rejected" && meta?.rejectReason ? (
          <div className="mt-3 rounded-md border border-destructive/30 bg-background/80 px-3 py-2 text-sm">
            <span className="font-medium text-destructive">Alasan penolakan: </span>
            {meta.rejectReason}
          </div>
        ) : null}
        {status === "verified" && order.paymentProofVerifiedAt ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Diverifikasi {new Date(order.paymentProofVerifiedAt).toLocaleString("id-ID")}
          </p>
        ) : null}
      </div>

      {status === "unpaid" && !hasProof ? (
        <p className="mt-3 text-sm text-muted-foreground">Menunggu pelanggan mengirim bukti transfer di WhatsApp.</p>
      ) : null}

      {(hasProof || showMeta) && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,220px)_1fr]">
          {hasProof && order.paymentProofMessageId ? (
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Screenshot</p>
              <OrderProofImage messageId={order.paymentProofMessageId} />
            </div>
          ) : null}
          <div className="space-y-3">
            <MetaRow label="Total pesanan">{formatRupiah(order.total)}</MetaRow>
            {meta?.amount != null ? <MetaRow label="Nominal OCR">{formatRupiah(meta.amount)}</MetaRow> : null}
            {meta?.bank ? <MetaRow label="Bank">{meta.bank}</MetaRow> : null}
            {meta?.accountNumber ? <MetaRow label="Rekening">{meta.accountNumber}</MetaRow> : null}
            {meta?.confidence != null && meta.confidence > 0 ? (
              <MetaRow label="Keyakinan OCR">{(meta.confidence * 100).toFixed(0)}%</MetaRow>
            ) : null}
            {meta?.flags && meta.flags.length > 0 ? (
              <MetaRow label="Catatan sistem">{meta.flags.join(", ")}</MetaRow>
            ) : null}
          </div>
        </div>
      )}

      {showVerifyReject || showReverify || showUnblock ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          {showVerifyReject || showReverify ? (
            <Button size="sm" disabled={verifyPending} onClick={onVerify}>
              {showReverify ? "Verifikasi ulang" : "Verifikasi"}
            </Button>
          ) : null}
          {showVerifyReject ? (
            <Button size="sm" variant="outline" disabled={rejectPending} onClick={onReject}>
              Tolak bukti
            </Button>
          ) : null}
          {showUnblock ? (
            <Button size="sm" variant="outline" disabled={unblockPending} onClick={onUnblock}>
              Buka batas bukti
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
