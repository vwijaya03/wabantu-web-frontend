"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  CheckSquare,
  RefreshCw,
  TrendingUp,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  PlusCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { financeApi, formatIDR, txnTypeColor, txnTypeFlow, txnTypeLabel } from "@/lib/api/finance";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { formatFinanceDate, invalidateFinanceCaches } from "@/lib/finance/utils";
import { WalletIconBadge, resolveWalletAccent } from "@/lib/finance/wallet-icons";
import { useReportingTimezone } from "@/hooks/use-reporting-timezone";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { useTenantQueryEnabled } from "@/hooks/use-tenant-query-enabled";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";

const AddTransactionSheet = dynamic(
  () =>
    import("@/components/finance/add-transaction-sheet").then((mod) => ({
      default: mod.AddTransactionSheet,
    })),
  { ssr: false },
);

const baseNavCards = [
  { href: "/dashboard/finance/transactions", label: "Transaksi", icon: BookOpen, desc: "Catat pemasukan & pengeluaran" },
  { href: "/dashboard/finance/wallets", label: "Dompet", icon: Wallet, desc: "Kas, bank, e-wallet" },
  { href: "/dashboard/finance/transaction-types", label: "Jenis Transaksi", icon: BookOpen, desc: "Label Pemasukan, Pengeluaran, dll.", ownerOnly: true as const },
  { href: "/dashboard/finance/budget", label: "Anggaran", icon: BarChart3, desc: "Pantau batas pengeluaran" },
  { href: "/dashboard/finance/investment", label: "Investasi", icon: TrendingUp, desc: "Saham, kripto, emas" },
  { href: "/dashboard/finance/recurring", label: "Otomatis", icon: RefreshCw, desc: "Tagihan berulang" },
  { href: "/dashboard/finance/checklist", label: "Tagihan Bulanan", icon: CheckSquare, desc: "Checklist tagihan & catat transaksi" },
  { href: "/dashboard/finance/reports", label: "Laporan", icon: BarChart3, desc: "Export PDF & CSV" },
];

export default function FinancePage() {
  const [openAdd, setOpenAdd] = useState(false);
  const { user } = useAuth();
  const tenantKey = useTenantKey();
  const tenantReady = useTenantQueryEnabled();
  const qc = useQueryClient();
  const canManage = canPerformOwnerActions(user);
  const reportingTimezone = useReportingTimezone();

  const navCards = baseNavCards.filter((n) => !("ownerOnly" in n && n.ownerOnly) || canManage);

  const {
    data: dashboard,
    isLoading: dashboardLoading,
    isError: dashboardError,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "finance-dashboard"),
    queryFn: ({ signal }) => financeApi.dashboard(undefined, signal),
    enabled: tenantReady,
  });

  const { data: recentData } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "finance-transactions-recent"),
    queryFn: ({ signal }) => financeApi.listTransactions({ pageSize: 5 }, signal),
    enabled: tenantReady,
  });

  const { data: txnTypesData } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "finance-transaction-types", "dashboard"),
    queryFn: ({ signal }) => financeApi.listTransactionTypes({ pageSize: 100 }, signal),
    enabled: tenantReady,
  });
  const txnTypes = txnTypesData?.items ?? [];

  const { data: checklist } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "finance-checklist-today"),
    queryFn: ({ signal }) => financeApi.todayChecklist(signal),
    enabled: tenantReady,
  });

  const pendingChecklist = checklist?.pending ?? 0;
  const pendingApproval = dashboard?.pendingCount ?? 0;

  const amountPrefix = (type: string) => {
    const flow = txnTypeFlow(type, txnTypes);
    if (flow === "income") return "+";
    if (flow === "transfer") return "";
    return "-";
  };

  return (
    <>
      <PageHeader
        title="Finance"
        description="Kelola keuangan bisnis Anda dengan mudah."
        actions={
          <Button onClick={() => setOpenAdd(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Catat Transaksi
          </Button>
        }
      />

      {dashboardError && (
        <Card className="border-destructive">
          <CardContent className="py-4 text-sm text-destructive">
            Gagal memuat ringkasan keuangan.{" "}
            <button type="button" className="underline" onClick={() => refetchDashboard()}>
              Coba lagi
            </button>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total Saldo</p>
            <p className="mt-1 text-2xl font-bold">
              {dashboardLoading ? "…" : formatIDR(dashboard?.totalWallets ?? "0")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Semua dompet aktif</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Pemasukan</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {dashboardLoading ? "…" : formatIDR(dashboard?.totalIncome ?? "0")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{dashboard?.period ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
              <p className="text-xs text-muted-foreground">Pengeluaran</p>
            </div>
            <p className="mt-1 text-2xl font-bold text-red-600">
              {dashboardLoading ? "…" : formatIDR(dashboard?.totalExpense ?? "0")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{dashboard?.period ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Selisih Bulan Ini</p>
            <p
              className={cn(
                "mt-1 text-2xl font-bold",
                parseFloat(dashboard?.netBalance ?? "0") >= 0 ? "text-green-600" : "text-red-600",
              )}
            >
              {dashboardLoading ? "…" : formatIDR(dashboard?.netBalance ?? "0")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Pemasukan − Pengeluaran</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts row */}
      {(pendingApproval > 0 || pendingChecklist > 0) && (
        <div className="flex flex-wrap gap-3">
          {pendingApproval > 0 && (
            <Link href="/dashboard/finance/transactions?status=pending_approval">
              <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 cursor-pointer">
                <CardContent className="flex items-center gap-2 p-4">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    {pendingApproval} transaksi menunggu persetujuan
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}
          {pendingChecklist > 0 && (
            <Link href="/dashboard/finance/checklist">
              <Card className="border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 cursor-pointer">
                <CardContent className="flex items-center gap-2 p-4">
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    {pendingChecklist} checklist hari ini belum selesai
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      {/* Wallet snapshots */}
      {(dashboard?.wallets?.length ?? 0) > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Saldo Dompet</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {dashboard!.wallets.map((w) => {
              const accent = resolveWalletAccent(w.color, w.type);
              return (
                <Card
                  key={w.id}
                  style={{ borderLeftColor: accent, borderLeftWidth: 4 }}
                >
                  <CardContent className="flex items-start gap-3 p-4">
                    <WalletIconBadge icon={w.icon} type={w.type} color={w.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{w.name}</p>
                      <p className="mt-1 text-lg font-bold">{formatIDR(w.balance)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {navCards.map((n) => (
          <Link key={n.href} href={n.href}>
            <Card className="h-full cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-start gap-3 p-5">
                <div className="mt-0.5 rounded-md bg-primary/10 p-2">
                  <n.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent transactions */}
      {(recentData?.items?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base">Transaksi Terbaru</CardTitle>
              <CardDescription>5 transaksi terakhir</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/finance/transactions">Lihat semua</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentData!.items.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{txn.description ?? txnTypeLabel(txn.type, txnTypes)}</p>
                  <p className="text-xs text-muted-foreground">
                    {txn.categoryName ?? "—"} · {formatFinanceDate(txn.transactionDate, reportingTimezone)} · {txn.walletName}
                  </p>
                </div>
                <div className="ml-3 shrink-0 text-right">
                  <p className={cn("text-sm font-semibold tabular-nums", txnTypeColor(txn.type, txnTypes))}>
                    {amountPrefix(txn.type)}
                    {formatIDR(txn.amount)}
                  </p>
                  {txn.status !== "approved" && (
                    <Badge variant="outline" className="text-[10px]">
                      {txn.status === "pending_approval" ? "Menunggu" : txn.status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AddTransactionSheet
        open={openAdd}
        onOpenChange={setOpenAdd}
        onCreated={() => invalidateFinanceCaches(qc, tenantKey)}
      />
    </>
  );
}
