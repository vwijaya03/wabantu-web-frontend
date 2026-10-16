"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api/client";
import { ordersApi, type Order } from "@/lib/api/orders";
import { useLocale } from "@/lib/i18n/locale";

/**
 * Satu tombol "Setujui pesanan" → POST /orders/:id/approve (verifikasi bukti + selesai + pemasukan, satu transaksi).
 * Tidak merangkai verify + PATCH. Idempotent di backend: order yang sudah selesai mengembalikan 200 tanpa menulis.
 */
export function OrderApproveButton({
  order,
  canManage,
  onApproved,
  onReload,
  readOnly = false,
  size = "sm",
}: {
  order: Pick<Order, "id" | "status" | "paymentProofMessageId"> & { hasProof?: boolean; updatedAt?: string };
  canManage: boolean;
  onApproved?: (o: Order) => void;
  /** Muat ulang data order (dipanggil dari tombol "Muat ulang" setelah 409 aborted). */
  onReload?: () => void;
  /** Sesi Pantau (impersonate): backend menolak approve (403) → tombol nonaktif + keterangan. */
  readOnly?: boolean;
  size?: "sm" | "default";
}) {
  const { t } = useLocale();
  const qc = useQueryClient();
  const [unavailable, setUnavailable] = useState(false);
  // 409 code "aborted": order berubah sejak dimuat (expectedUpdatedAt tidak cocok) → minta muat ulang.
  const [staleAt, setStaleAt] = useState<string | null>(null);
  const stale = staleAt !== null && staleAt === (order.updatedAt ?? "");
  const hasProof = order.hasProof ?? Boolean(order.paymentProofMessageId);
  const done = order.status === "completed";

  const mut = useMutation({
    mutationFn: () => ordersApi.approve(order.id, order.updatedAt || undefined),
    onSuccess: (o) => {
      toast.success(t("Pesanan disetujui dan diselesaikan"));
      onApproved?.(o);
    },
    onError: (err) => {
      const e = toApiError(err);
      if (e.status === 404 && /order not found/i.test(e.message)) {
        toast.error(t("Pesanan tidak ditemukan."));
      } else if (e.status === 404) {
        setUnavailable(true);
        toast.error(t("Endpoint persetujuan belum tersedia di backend."));
      } else if (e.status === 409 && e.code === "aborted") {
        setStaleAt(order.updatedAt ?? "");
      } else if (e.status === 409) {
        toast.error(t("Belum bisa disetujui: {message}", { message: e.message }));
      } else if (e.status === 403) {
        toast.error(t("Tidak diizinkan menyetujui: hanya owner tenant (mode pantau hanya lihat)."));
      } else if (e.status === 0 || e.status === undefined || e.status >= 500) {
        toast.error(t("Gagal, coba lagi"));
      } else {
        toast.error(t(e.message));
      }
    },
  });

  if (!canManage) return null;
  if (readOnly) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button size={size} disabled title={t("Mode pantau: hanya lihat")}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {t("Setujui pesanan")}
        </Button>
        <span className="text-xs text-muted-foreground">{t("Mode pantau: hanya lihat")}</span>
      </div>
    );
  }
  if (stale) {
    return (
      <div className="flex flex-wrap items-center gap-2" role="status">
        <span className="text-sm text-amber-700">{t("Pesanan berubah, muat ulang")}</span>
        <Button
          size={size}
          variant="outline"
          onClick={() => {
            setStaleAt(null);
            if (onReload) onReload();
            else void qc.invalidateQueries({ queryKey: ["orders"] });
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("Muat ulang")}
        </Button>
      </div>
    );
  }
  const title = unavailable
    ? t("Endpoint belum tersedia")
    : done
      ? t("Pesanan sudah selesai")
      : !hasProof
        ? t("Belum ada bukti transfer")
        : undefined;

  return (
    <Button
      size={size}
      onClick={() => mut.mutate()}
      disabled={unavailable || done || !hasProof || mut.isPending}
      title={title}
    >
      {mut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
      {done
        ? t("Sudah disetujui")
        : unavailable
          ? t("Persetujuan belum tersedia")
          : t("Setujui pesanan")}
    </Button>
  );
}
