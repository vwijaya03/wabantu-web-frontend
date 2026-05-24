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
import { billingApi, type Invoice, type Plan } from "@/lib/api/billing";
import { paymentApi } from "@/lib/api/payment";
import { UsageQuotaPanel } from "@/components/dashboard/usage-quota-panel";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

async function openQRISForInvoice(inv: Invoice, description: string) {
  const qris = await paymentApi.createQRIS({
    invoiceId: inv.id,
    amountIdr: inv.amountIdr,
    description,
  });
  if (qris.qrUrl) {
    window.open(qris.qrUrl, "_blank", "noopener,noreferrer");
  }
  toast.success("QRIS dibuka — selesaikan pembayaran di tab baru");
}

export default function BillingPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["billing-overview"],
    queryFn: () => billingApi.overview(),
  });
  const sub = data?.subscription;
  const pending = data?.pendingCheckout ?? null;

  const checkoutMut = useMutation({
    mutationFn: async (plan: Plan) => {
      const result = await billingApi.selectPlan({ planCode: plan.code });
      const inv = result.pendingInvoice;
      if (!inv) {
        throw new Error("Checkout gagal — invoice tidak dibuat");
      }
      await openQRISForInvoice(inv, `WABantu ${plan.name}`);
      return result;
    },
    onSuccess: () => {
      toast.message(
        "Menunggu pembayaran",
        {
          description:
            "Paket aktif setelah QRIS berhasil. Invoice muncul di riwayat setelah dibayar.",
        },
      );
      void qc.invalidateQueries({ queryKey: ["billing-overview"] });
      void qc.invalidateQueries({ queryKey: ["usage-summary"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const payPendingMut = useMutation({
    mutationFn: async () => {
      if (!pending) throw new Error("Tidak ada tagihan menunggu pembayaran");
      await openQRISForInvoice(
        pending,
        `WABantu ${pending.planName}`,
      );
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const activePaidPlan =
    sub && !sub.isTrial ? sub.planCode : null;
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
            Pilih paket lalu bayar via QRIS. Paket dan invoice final aktif setelah
            pembayaran berhasil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium">
              {isLoading
                ? "Memuat..."
                : sub?.isTrial
                  ? `Trial 7 hari — semua fitur aktif (Broadcast, Workflow, CRM, AI hybrid, Cabang)`
                  : `${sub?.planName ?? "Starter"} (${sub?.planCode ?? "starter"})`}
            </p>
            <p className="text-xs text-muted-foreground">
              {sub?.trialEndsAt
                ? `Trial berakhir: ${new Date(sub.trialEndsAt).toLocaleDateString("id-ID")}`
                : sub?.isTrial
                  ? "Upgrade dengan memilih paket di bawah"
                  : "Berlangganan aktif"}
            </p>
          </div>

          {pending ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
              <p className="font-medium text-amber-950 dark:text-amber-50">
                Menunggu pembayaran — {pending.planName}
              </p>
              <p className="mt-1 text-muted-foreground">
                {pending.invoiceNo} · Rp{" "}
                {pending.amountIdr.toLocaleString("id-ID")} · Invoice akan masuk
                riwayat setelah QRIS lunas.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                disabled={payPendingMut.isPending}
                onClick={() => payPendingMut.mutate()}
              >
                {payPendingMut.isPending
                  ? "Membuka QRIS..."
                  : "Bayar via QRIS (Midtrans)"}
              </Button>
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-3">
            {(data?.plans ?? []).map((plan) => {
              const isPaidActive = activePaidPlan === plan.code;
              const isPendingChoice = pending?.planCode === plan.code;
              return (
                <button
                  key={plan.code}
                  type="button"
                  disabled={checkoutMut.isPending}
                  onClick={() => checkoutMut.mutate(plan)}
                  className={`rounded-lg border p-3 text-left transition hover:border-primary disabled:opacity-60 ${
                    isPaidActive
                      ? "border-primary bg-primary/5"
                      : isPendingChoice
                        ? "border-amber-500/60 bg-amber-500/5"
                        : ""
                  }`}
                >
                  <p className="text-sm font-semibold">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Rp {plan.amountIdr.toLocaleString("id-ID")} / bulan
                  </p>
                  <ul className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
                    <li>
                      {plan.limits.channels} channel · {plan.limits.seats} seat
                    </li>
                    <li>
                      {plan.limits.aiConversations.toLocaleString("id-ID")} percakapan AI
                    </li>
                    <li>
                      {(plan.limits.aiTokens / 1_000_000).toFixed(0)} jt token AI
                    </li>
                    <li>
                      Broadcast:{" "}
                      {plan.limits.broadcastContacts === 0
                        ? "—"
                        : plan.limits.broadcastContacts.toLocaleString("id-ID")}
                      /bln
                    </li>
                    <li>
                      {plan.limits.storageMb >= 1024
                        ? `${(plan.limits.storageMb / 1024).toFixed(0)} GB`
                        : `${plan.limits.storageMb} MB`}{" "}
                      · {plan.limits.workflowExecs.toLocaleString("id-ID")} workflow
                    </li>
                  </ul>
                  {isPendingChoice ? (
                    <p className="mt-2 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                      Menunggu pembayaran
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Klik kartu paket untuk membuat checkout dan membuka QRIS. Bukan
            mengganti paket langsung.
          </p>
        </CardContent>
      </Card>
      <UsageQuotaPanel />
      <Card>
        <CardHeader>
          <CardTitle>Riwayat invoice</CardTitle>
          <CardDescription>
            Hanya tagihan yang sudah dibayar (setelah QRIS berhasil).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.invoices ?? []).length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Belum ada invoice lunas. Invoice muncul di sini setelah pembayaran
              QRIS berhasil.
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
                    {inv.planName} ·{" "}
                    {new Date(inv.paidAt ?? inv.issuedAt).toLocaleDateString(
                      "id-ID",
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    Rp {inv.amountIdr.toLocaleString("id-ID")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {inv.status === "paid" ? "Lunas" : inv.status}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
