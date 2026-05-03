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
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function BillingPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["billing-overview"],
    queryFn: () => billingApi.overview(),
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() =>
                selectPlanMut.mutate({ planCode: "basic", provider: "midtrans" })
              }
            >
              Checkout Midtrans (simulasi)
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                selectPlanMut.mutate({ planCode: "pro", provider: "xendit" })
              }
            >
              Checkout Xendit (simulasi)
            </Button>
          </div>
        </CardContent>
      </Card>
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
