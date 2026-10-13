"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toApiError } from "@/lib/api/client";
import { ordersApi } from "@/lib/api/orders";
import type { SimOrder, SimPricing } from "@/lib/api/simulator";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Belum bayar",
  proof_submitted: "Bukti dikirim",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

export function ProofCheckBadge({ value }: { value?: string }) {
  if (value === "cocok") return <Badge className="bg-emerald-600 hover:bg-emerald-600">Bukti cocok</Badge>;
  if (value === "perlu_dicek") return <Badge className="bg-amber-500 hover:bg-amber-500">Perlu dicek</Badge>;
  return null;
}

export function SimulatorOrderPanel({
  order,
  pricing,
  canApprove,
  onChanged,
}: {
  order: SimOrder | null | undefined;
  pricing: SimPricing | null | undefined;
  canApprove: boolean;
  onChanged: () => void;
}) {
  // Persetujuan owner memakai endpoint order yang sudah ada (POST /orders/:id/payment-proof/verify).
  const approveMut = useMutation({
    mutationFn: (id: string) => ordersApi.verifyPaymentProof(id),
    onSuccess: () => {
      toast.success("Bukti transfer disetujui");
      onChanged();
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pesanan</CardTitle>
        <CardDescription>
          {pricing ? (
            <>
              Tingkat harga: <span className="font-medium text-foreground">{pricing.tierLabel || pricing.tier}</span>
            </>
          ) : (
            "Tingkat harga muncul setelah pesan pertama."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!order ? (
          <p className="text-muted-foreground">Belum ada pesanan di percakapan ini.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{order.orderNumber}</span>
              <Badge variant="outline">{order.status}</Badge>
              <Badge variant="secondary">{PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}</Badge>
              <ProofCheckBadge value={order.proofCheck} />
            </div>
            {order.proofCheck === "perlu_dicek" && order.proofCheckReasons && order.proofCheckReasons.length > 0 && (
              <ul className="list-disc pl-5 text-xs text-amber-700">
                {order.proofCheckReasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
            <div className="divide-y rounded-md border">
              {order.items.map((it, i) => (
                <div key={i} className="flex justify-between gap-2 px-3 py-2">
                  <span>
                    {it.name}
                    <span className="text-muted-foreground">
                      {" "}
                      × {it.qty}
                      {it.unit ? ` ${it.unit}` : ""} @ {rupiah.format(it.unitPrice)}
                    </span>
                  </span>
                  <span className="shrink-0">{rupiah.format(it.unitPrice * it.qty)}</span>
                </div>
              ))}
              <div className="flex justify-between px-3 py-2 font-medium">
                <span>Total</span>
                <span>{rupiah.format(order.total)}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canApprove && order.paymentStatus === "proof_submitted" && (
                <Button size="sm" onClick={() => approveMut.mutate(order.id)} disabled={approveMut.isPending}>
                  {approveMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Setujui bukti transfer
                </Button>
              )}
              <Button size="sm" variant="outline" asChild>
                <Link href={`/dashboard/orders?highlight=${order.id}`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Buka di Pesanan
                </Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
