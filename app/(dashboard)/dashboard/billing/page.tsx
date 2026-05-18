"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { billingApi } from "@/lib/api/billing";
import { paymentApi } from "@/lib/api/payment";
import { usageApi } from "@/lib/api/usage";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function BillingPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["billing-overview"],
    queryFn: () => billingApi.overview(),
  });
  const { data: usage } = useQuery({
    queryKey: ["usage-summary"],
    queryFn: () => usageApi.summary(),
  });
  const sub = data?.subscription;
  const selectPlanMut = useMutation({
    mutationFn: billingApi.selectPlan,
    onSuccess: () => {
      toast.success("Paket berhasil diubah");
      void qc.invalidateQueries({ queryKey: ["billing-overview"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <>
      <PageHeader
        title="Billing"
        description="Paket berlangganan dan riwayat tagihan Anda."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Paket aktif
            <Badge variant={sub?.isTrial ? "warning" : "success"}>
              {sub?.isTrial ? "Trial 7 hari" : sub?.status ?? "active"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Pilih paket sesuai kebutuhan tim. Siap dihubungkan ke Midtrans/Xendit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">
              {isLoading ? "Memuat..." : `${sub?.planName ?? "Starter"} (${sub?.planCode ?? "starter"})`}
            </p>
            <p className="text-xs text-muted-foreground">
              {sub?.trialEndsAt
                ? `Trial berakhir: ${new Date(sub.trialEndsAt).toLocaleDateString("id-ID")}`
                : "Berlangganan aktif"}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(data?.plans ?? []).map((plan) => (
              <button
                key={plan.code}
                type="button"
                onClick={() => selectPlanMut.mutate({ planCode: plan.code })}
                className={`rounded-lg border p-3 text-left transition hover:border-primary ${
                  sub?.planCode === plan.code ? "border-primary bg-primary/5" : ""
                }`}
              >
                <p className="text-sm font-semibold">{plan.name}</p>
                <p className="text-xs text-muted-foreground">
                  Rp {plan.amountIdr.toLocaleString("id-ID")} / bulan
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {plan.limits.channels} channel · {plan.limits.seats} seat
                </p>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const inv = data?.invoices?.[0];
                  const amount = data?.plans?.find((p) => p.code === sub?.planCode)?.amountIdr ?? 299000;
                  const qris = await paymentApi.createQRIS({
                    invoiceId: inv?.id ?? sub?.id ?? "plan",
                    amountIdr: amount,
                    description: `WABantu ${sub?.planName ?? "plan"}`,
                  });
                  window.open(qris.qrUrl, "_blank", "noopener,noreferrer");
                  toast.success("QRIS dibuka — selesaikan pembayaran di tab baru");
                } catch (e) {
                  toast.error(toApiError(e).message);
                }
              }}
            >
              Bayar via QRIS (Midtrans)
            </Button>
          </div>
        </CardContent>
      </Card>
      {usage ? (
        <Card>
          <CardHeader>
            <CardTitle>Pemakaian bulan ini ({usage.period})</CardTitle>
            <CardDescription>Paket: {usage.plan}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {usage.quotas.map((q) => (
              <div key={q.eventType} className="rounded border p-3 text-sm">
                <p className="font-medium">{q.eventType}</p>
                <p className="text-muted-foreground">
                  {q.used} / {q.limit > 0 ? q.limit : "∞"} (sisa {q.remaining})
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.invoices ?? []).length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Belum ada invoice.
            </p>
          ) : (
            (data?.invoices ?? []).map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">{inv.invoiceNo}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.planName} · {new Date(inv.issuedAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    Rp {inv.amountIdr.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-muted-foreground">{inv.status}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
