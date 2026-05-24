"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, PlusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { financeApi, formatIDR, type MonthlyComparisonItem } from "@/lib/api/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ReportsPage() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [format, setFormat] = useState<"pdf" | "csv">("csv");

  const { data: comparison } = useQuery({
    queryKey: ["finance-monthly-comparison"],
    queryFn: () => financeApi.monthlyComparison(6),
  });

  const { data: categorySpending } = useQuery({
    queryKey: ["finance-category-spending", period],
    queryFn: () => financeApi.categorySpending(period),
  });

  const { data: jobs, refetch: refetchJobs } = useQuery({
    queryKey: ["finance-report-jobs"],
    queryFn: () => financeApi.listReportJobs(),
    refetchInterval: 5000, // poll every 5s for job status
  });

  const exportMut = useMutation({
    mutationFn: () =>
      financeApi.createReportJob({
        type: "monthly",
        period,
        startDate: "",
        endDate: "",
        format,
      }),
    onSuccess: () => {
      toast.success("Export dimulai — tunggu sebentar");
      qc.invalidateQueries({ queryKey: ["finance-report-jobs"] });
    },
    onError: () => toast.error("Gagal membuat export"),
  });

  const months = comparison?.items ?? [];
  const maxExpense = Math.max(...months.map((m) => parseFloat(m.expense)), 1);

  return (
    <>
      <PageHeader
        title="Laporan Keuangan"
        description="Ringkasan dan export laporan bisnis."
        actions={
          <div className="flex gap-2">
            <Select value={format} onValueChange={(v) => setFormat(v as "pdf" | "csv")}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => exportMut.mutate()} disabled={exportMut.isPending}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {exportMut.isPending ? "Memproses..." : "Export Laporan"}
            </Button>
          </div>
        }
      />

      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const v = d.toISOString().slice(0, 7);
            return (
              <SelectItem key={v} value={v}>
                {d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

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
            <CardDescription>{period}</CardDescription>
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
            <CardTitle className="text-base">Riwayat Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {jobs!.items.map((j) => (
              <div key={j.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium capitalize">{j.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(j.createdAt).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={j.status === "done" ? "default" : j.status === "failed" ? "destructive" : "secondary"}
                  >
                    {j.status === "queued" ? "Antri" : j.status === "done" ? "Selesai" : j.status === "failed" ? "Gagal" : j.status}
                  </Badge>
                  {j.status === "done" && j.downloadUrl && !j.downloadUrl.startsWith("data:") && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={j.downloadUrl} download>
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

function MonthBar({ item, maxExpense }: { item: MonthlyComparisonItem; maxExpense: number }) {
  const expPct = Math.min((parseFloat(item.expense) / maxExpense) * 100, 100);
  const incPct = Math.min((parseFloat(item.income) / maxExpense) * 100, 100);
  const net = parseFloat(item.net);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {new Date(item.period + "-01").toLocaleDateString("id-ID", { month: "short", year: "2-digit" })}
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
