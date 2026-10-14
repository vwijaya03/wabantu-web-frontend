"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderApproveButton } from "@/components/orders/order-approve-button";
import { ProofCheckBadge, ProofCheckReasons } from "@/components/orders/proof-check-badge";
import type { SimOrder, SimPricing } from "@/lib/api/simulator";

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Belum bayar",
  proof_submitted: "Bukti dikirim",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

export function SimulatorOrderPanel({
  order,
  pricing,
  canApprove,
  readOnly = false,
  onChanged,
}: {
  order: SimOrder | null | undefined;
  pricing: SimPricing | null | undefined;
  canApprove: boolean;
  /** true saat sesi Pantau (impersonate) → approve hanya lihat. */
  readOnly?: boolean;
  onChanged: () => void;
}) {
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
            <ProofCheckReasons value={order.proofCheck} reasons={order.proofCheckReasons} />
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
              <OrderApproveButton
                order={{
                  id: order.id,
                  status: order.status,
                  updatedAt: order.updatedAt,
                  hasProof: order.paymentStatus !== "unpaid" || Boolean(order.proofCheck),
                }}
                canManage={canApprove}
                onApproved={onChanged}
                onReload={onChanged}
                readOnly={readOnly}
              />
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
