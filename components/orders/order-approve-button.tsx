"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
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
  size = "sm",
}: {
  order: Pick<Order, "id" | "status" | "paymentProofMessageId"> & { hasProof?: boolean };
  canManage: boolean;
  onApproved?: (o: Order) => void;
  size?: "sm" | "default";
}) {
  const [unavailable, setUnavailable] = useState(false);
  const hasProof = order.hasProof ?? Boolean(order.paymentProofMessageId);
  const done = order.status === "completed";

  const mut = useMutation({
    mutationFn: () => ordersApi.approve(order.id),
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
      } else if (e.status === 409) {
        toast.error(`Belum bisa disetujui: ${e.message}`);
      } else if (e.status === 403) {
        toast.error("Hanya owner yang bisa menyetujui pesanan.");
      } else if (e.status === 0 || e.status === undefined || e.status >= 500) {
        // 5xx / jaringan: aman diulang (backend idempotent, stok dipotong sekali). Tombol tetap aktif.
        toast.error("Gagal, coba lagi");
      } else {
        toast.error(e.message);
      }
    },
  });

  if (!canManage) return null;
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
