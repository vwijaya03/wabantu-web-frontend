"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toApiError } from "@/lib/api/client";
import { ordersApi, type Order } from "@/lib/api/orders";

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
      toast.success("Pesanan disetujui dan diselesaikan");
      onApproved?.(o);
    },
    onError: (err) => {
      const e = toApiError(err);
      if (e.status === 404 && /order not found/i.test(e.message)) {
        toast.error("Pesanan tidak ditemukan.");
      } else if (e.status === 404) {
        // Route belum ada di backend yang terhubung.
        setUnavailable(true);
        toast.error("Endpoint persetujuan belum tersedia di backend.");
      } else if (e.status === 409 && e.code === "aborted") {
        setStaleAt(order.updatedAt ?? "");
      } else if (e.status === 409) {
        toast.error(`Belum bisa disetujui: ${e.message}`);
      } else if (e.status === 403) {
        // Tanpa redirect/logout: 403 = tidak berwenang (bukan owner, atau mode pantau hanya lihat).
        toast.error("Tidak diizinkan menyetujui: hanya owner tenant (mode pantau hanya lihat).");
      } else if (e.status === 0 || e.status === undefined || e.status >= 500) {
        // 5xx / jaringan: aman diulang (backend idempotent, stok dipotong sekali). Tombol tetap aktif.
        toast.error("Gagal, coba lagi");
      } else {
        toast.error(e.message);
      }
    },
  });

  if (!canManage) return null;
  if (readOnly) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button size={size} disabled title="Mode pantau: hanya lihat">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Setujui pesanan
        </Button>
        <span className="text-xs text-muted-foreground">Mode pantau: hanya lihat</span>
      </div>
    );
  }
  if (stale) {
    return (
      <div className="flex flex-wrap items-center gap-2" role="status">
        <span className="text-sm text-amber-700">Pesanan berubah, muat ulang</span>
        <Button
          size={size}
          variant="outline"
          onClick={() => {
            setStaleAt(null);
            // Default (mis. halaman Pesanan): refetch daftar order.
            if (onReload) onReload();
            else void qc.invalidateQueries({ queryKey: ["orders"] });
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Muat ulang
        </Button>
      </div>
    );
  }
  const title = unavailable
    ? "Endpoint belum tersedia"
    : done
      ? "Pesanan sudah selesai"
      : !hasProof
        ? "Belum ada bukti transfer"
        : undefined;

  return (
    <Button
      size={size}
      onClick={() => mut.mutate()}
      disabled={unavailable || done || !hasProof || mut.isPending}
      title={title}
    >
      {mut.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
      {done ? "Sudah disetujui" : unavailable ? "Persetujuan belum tersedia" : "Setujui pesanan"}
    </Button>
  );
}
