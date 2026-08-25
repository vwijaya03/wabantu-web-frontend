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
import { useTenantKey } from "@/hooks/use-tenant-key";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { invalidateTenantQueries, tenantQueryKey } from "@/lib/query/tenant-query-key";

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
  const tenantKey = useTenantKey();
  const tenantReady = useTenantQueryEnabled();
  const { data, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "billing-overview"),
    queryFn: () => billingApi.overview(),
    enabled: tenantReady,
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
      invalidateTenantQueries(qc, tenantKey, "billing-overview");
      invalidateTenantQueries(qc, tenantKey, "usage-summary");
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

  const topUpMut = useMutation({
    mutationFn: async (code: string) => {
      const result = await billingApi.createTopUp(code);
      const inv = result.pendingInvoice;
      if (!inv) {
        throw new Error("Checkout top-up gagal — invoice tidak dibuat");
      }
      await openQRISForInvoice(inv, result.topUp.name);
      return result;
    },
    onSuccess: () => {
      toast.message("Menunggu pembayaran top-up", {
        description:
          "Kuota tambahan aktif setelah QRIS lunas dan berlaku untuk bulan berjalan.",
      });
      invalidateTenantQueries(qc, tenantKey, "billing-overview");
      invalidateTenantQueries(qc, tenantKey, "usage-summary");
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
          <CardTitle>Top-up kuota AI</CardTitle>
          <CardDescription>
            Untuk tenant yang kuota AI-nya habis sebelum akhir bulan. Top-up tidak
            mengganti paket dan hanya berlaku pada periode bulan berjalan.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {(data?.topUpOptions ?? []).map((opt) => (
            <button
              key={opt.code}
              type="button"
              disabled={topUpMut.isPending || !!pending}
              onClick={() => topUpMut.mutate(opt.code)}
              className="rounded-lg border p-4 text-left transition hover:border-primary disabled:opacity-60"
            >
              <p className="font-semibold">{opt.name}</p>
              <p className="text-sm text-muted-foreground">
                Rp {opt.amountIdr.toLocaleString("id-ID")}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li>+{opt.aiTokens.toLocaleString("id-ID")} token AI</li>
                <li>+{opt.aiConversations.toLocaleString("id-ID")} percakapan AI</li>
                <li>Berlaku periode {opt.validForPeriod}</li>
              </ul>
            </button>
          ))}
          {pending ? (
            <p className="sm:col-span-2 text-xs text-muted-foreground">
              Selesaikan invoice pending terlebih dahulu sebelum membuat top-up baru.
            </p>
          ) : null}
        </CardContent>
      </Card>
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
