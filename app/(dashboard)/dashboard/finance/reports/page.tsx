"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, PlusCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinanceSubPageHeader } from "@/components/finance/finance-sub-page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { financeApi, formatIDR, type MonthlyComparisonItem } from "@/lib/api/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  currentFinancePeriod,
  financeMonthOptions,
  formatFinanceDateTime,
  todayISOInTimezone,
} from "@/lib/finance/utils";
import { useReportingTimezone } from "@/hooks/use-reporting-timezone";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";

type ReportRange = "monthly" | "custom" | "all_time";

export default function ReportsPage() {
  const qc = useQueryClient();
  const tenantKey = useTenantKey();
  const reportingTimezone = useReportingTimezone();
  const currentPeriod = currentFinancePeriod(reportingTimezone);
  const monthOptions = financeMonthOptions(reportingTimezone, 12);
  const [period, setPeriod] = useState("");
  const effectivePeriod = period || currentPeriod;
  const [format, setFormat] = useState<"pdf" | "csv">("csv");
  const [reportRange, setReportRange] = useState<ReportRange>("monthly");
  const [customStartDate, setCustomStartDate] = useState(() => `${currentPeriod}-01`);
  const [customEndDate, setCustomEndDate] = useState(() => todayISOInTimezone(reportingTimezone));

  const { data: comparison } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "finance-monthly-comparison"),
    queryFn: ({ signal }) => financeApi.monthlyComparison(6, signal),
  });

  const { data: categorySpending } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "finance-category-spending", effectivePeriod),
    queryFn: ({ signal }) => financeApi.categorySpending(effectivePeriod, signal),
  });

  const { data: jobs, refetch: refetchJobs, isFetching: isFetchingJobs } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "finance-report-jobs"),
    queryFn: ({ signal }) => financeApi.listReportJobs(signal),
  });

  const exportMut = useMutation({
    mutationFn: () => {
      if (reportRange === "custom") {
        if (!customStartDate || !customEndDate) {
          throw new Error("Tanggal mulai dan selesai wajib diisi");
        }
        if (customEndDate < customStartDate) {
          throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai");
        }
      }

      return financeApi.createReportJob({
        type: reportRange,
        period: reportRange === "monthly" ? effectivePeriod : "",
        startDate: reportRange === "custom" ? customStartDate : "",
        endDate: reportRange === "custom" ? customEndDate : "",
        format,
      });
    },
    onSuccess: () => {
      toast.success("Export dimulai — klik refresh untuk cek hasil");
      qc.invalidateQueries({ queryKey: ["finance-report-jobs"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal membuat export"),
  });

  const months = comparison?.items ?? [];
  const maxExpense = Math.max(...months.map((m) => parseFloat(m.expense)), 1);

  return (
    <>
      <FinanceSubPageHeader
        title="Laporan Keuangan"
        description="Ringkasan dan export laporan bisnis."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export Laporan</CardTitle>
          <CardDescription>
            Pilih bulanan, rentang custom, atau sepanjang waktu. CSV untuk olah data, PDF untuk laporan siap baca.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="space-y-2">
            <Label>Cakupan</Label>
            <Select value={reportRange} onValueChange={(v) => setReportRange(v as ReportRange)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Bulanan</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
                <SelectItem value="all_time">Sepanjang waktu</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportRange === "monthly" ? (
            <div className="space-y-2">
              <Label>Periode</Label>
              <Select value={effectivePeriod} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : reportRange === "custom" ? (
            <>
              <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <DatePicker value={customStartDate} onChange={setCustomStartDate} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Selesai</Label>
                <DatePicker value={customEndDate} onChange={setCustomEndDate} />
              </div>
            </>
          ) : (
            <div className="space-y-2 md:col-span-2">
              <Label>Periode</Label>
              <div className="flex h-10 items-center rounded-md border px-3 text-sm text-muted-foreground">
                Semua transaksi approved sejak awal penggunaan finance.
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as "pdf" | "csv")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button className="w-full" onClick={() => exportMut.mutate()} disabled={exportMut.isPending}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {exportMut.isPending ? "Memproses..." : "Export"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Insight bulan:</span>
        <Select value={effectivePeriod} onValueChange={setPeriod}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Monthly comparison bar chart */}
      {months.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perbandingan 6 Bulan Terakhir</CardTitle>
            <CardDescription>Pemasukan dan pengeluaran per bulan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {months.map((m) => (
                <MonthBar key={m.period} item={m} maxExpense={maxExpense} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category spending */}
      {(categorySpending?.items?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pengeluaran per Kategori</CardTitle>
            <CardDescription>{effectivePeriod}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categorySpending!.items.map((c) => (
                <div key={c.categoryId} className="flex items-center justify-between">
                  <p className="text-sm">{c.categoryName}</p>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-600">{formatIDR(c.total)}</p>
                    <p className="text-[10px] text-muted-foreground">{c.txnCount} transaksi</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export jobs */}
      {(jobs?.items?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Riwayat Export</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchJobs()}
                disabled={isFetchingJobs}
              >
                <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isFetchingJobs && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {jobs!.items.map((j) => (
              <div key={j.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{reportTypeLabel(j.type)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFinanceDateTime(j.createdAt, reportingTimezone)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="uppercase">
                    {reportFormatLabel(j)}
                  </Badge>
                  <Badge
                    variant={j.status === "done" ? "default" : j.status === "failed" ? "destructive" : "secondary"}
                  >
                    {reportStatusLabel(j.status)}
                  </Badge>
                  {j.errorMsg && j.status !== "done" && (
                    <p
                      className={cn(
                        "max-w-[260px] truncate text-xs",
                        j.status === "failed" ? "text-destructive" : "text-muted-foreground",
                      )}
                      title={j.errorMsg}
                    >
                      {j.errorMsg}
                    </p>
                  )}
                  {j.status === "done" && j.downloadUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={j.downloadUrl} download={reportFileName(j)}>
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

function formatMonthLabel(period: string) {
  const [year, month] = period.split("-").map(Number);
  const d = new Date(Date.UTC(year || 1970, (month || 1) - 1, 1, 12));
  return new Intl.DateTimeFormat("id-ID", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

function reportFileName(job: { downloadUrl?: string; type: string; id: string; createdAt?: string; format?: string }) {
  const ext = reportFormatLabel(job).toLowerCase();
  const date = job.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  return `wabantu-${job.type}-${date}-${job.id.slice(0, 8)}.${ext}`;
}

function reportFormatLabel(job: { downloadUrl?: string; format?: string }) {
  const format = job.format?.toLowerCase();
  if (format === "pdf" || job.downloadUrl?.startsWith("data:application/pdf")) return "PDF";
  return "CSV";
}

function reportStatusLabel(status: string) {
  switch (status) {
    case "queued":
      return "Antri";
    case "processing":
      return "Diproses";
    case "done":
      return "Selesai";
    case "failed":
      return "Gagal";
    default:
      return status;
  }
}

function reportTypeLabel(type: string) {
  switch (type) {
    case "monthly":
      return "Bulanan";
    case "custom":
      return "Custom";
    case "all_time":
      return "Sepanjang waktu";
    default:
      return type;
  }
}

function MonthBar({ item, maxExpense }: { item: MonthlyComparisonItem; maxExpense: number }) {
  const expPct = Math.min((parseFloat(item.expense) / maxExpense) * 100, 100);
  const incPct = Math.min((parseFloat(item.income) / maxExpense) * 100, 100);
  const net = parseFloat(item.net);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {formatMonthLabel(item.period)}
        </p>
        <p className={cn("text-xs font-medium tabular-nums", net >= 0 ? "text-green-600" : "text-red-600")}>
          {net >= 0 ? "+" : ""}{formatIDR(item.net)}
        </p>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-14 text-right text-[10px] text-muted-foreground">Masuk</span>
          <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
            <div className="h-full rounded bg-green-500" style={{ width: `${incPct}%` }} />
          </div>
          <span className="w-20 text-[10px] tabular-nums text-right">{formatIDR(item.income)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 text-right text-[10px] text-muted-foreground">Keluar</span>
          <div className="flex-1 h-2 rounded bg-muted overflow-hidden">
            <div className="h-full rounded bg-red-500" style={{ width: `${expPct}%` }} />
          </div>
          <span className="w-20 text-[10px] tabular-nums text-right">{formatIDR(item.expense)}</span>
        </div>
      </div>
    </div>
  );
}
