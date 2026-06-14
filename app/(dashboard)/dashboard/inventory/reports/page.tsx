"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { inventoryApi, formatIDR, formatStockQty } from "@/lib/api/inventory";
import { downloadCSV } from "@/lib/inventory/csv";
import { cn } from "@/lib/utils";

type Tab = "valuation" | "margin";

export default function InventoryReportsPage() {
  const [tab, setTab] = useState<Tab>("valuation");
  return (
    <RequireTenantDashboard title="Laporan Persediaan">
      <PageHeader title="Laporan Persediaan" description="Nilai persediaan dan margin penjualan (revenue − HPP)." />
      <div className="mb-4 inline-flex gap-1 rounded-lg border bg-muted/40 p-1">
        <TabBtn active={tab === "valuation"} onClick={() => setTab("valuation")}>Nilai Persediaan</TabBtn>
        <TabBtn active={tab === "margin"} onClick={() => setTab("margin")}>Margin Penjualan</TabBtn>
      </div>
      {tab === "valuation" ? <ValuationReport /> : <MarginReport />}
    </RequireTenantDashboard>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}
    >
      {children}
    </button>
  );
}

function ValuationReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "stock", "report"],
    queryFn: () => inventoryApi.listStock({ pageSize: 1000 }),
  });
  const rows = data?.stock ?? [];
  const total = rows.reduce((s, r) => s + r.totalValue, 0);

  const byWarehouse = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.warehouseName, (m.get(r.warehouseName) ?? 0) + r.totalValue);
    return [...m.entries()];
  }, [rows]);

  const exportCSV = () => {
    downloadCSV(
      `nilai-persediaan-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Produk", "Kode", "Gudang", "On hand", "Tersedia", "HPP/unit", "Nilai"],
      rows.map((r) => [r.itemName, r.externalCode, r.warehouseName, r.onHand, r.available, r.avgUnitCost, r.totalValue]),
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total nilai persediaan</p>
            <p className="mt-1 text-2xl font-semibold">{formatIDR(total)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {byWarehouse.map(([name, value]) => (
                <Badge key={name} variant="secondary">{name}: {formatIDR(value)}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="flex items-start"><Button variant="outline" onClick={exportCSV} disabled={rows.length === 0}>Export CSV</Button></div>
      </div>

      <Card>
        <CardHeader><CardTitle>Rincian per Item</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Produk</th>
                  <th className="px-3 py-2 text-left">Gudang</th>
                  <th className="px-3 py-2 text-right">On hand</th>
                  <th className="px-3 py-2 text-right">HPP/unit</th>
                  <th className="px-3 py-2 text-right">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Memuat...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Belum ada data.</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={`${r.catalogItemId}-${r.warehouseId}`}>
                      <td className="px-3 py-2">{r.itemName}</td>
                      <td className="px-3 py-2">{r.warehouseName}</td>
                      <td className="px-3 py-2 text-right">{formatStockQty(r.onHand)}</td>
                      <td className="px-3 py-2 text-right">{formatIDR(r.avgUnitCost)}</td>
                      <td className="px-3 py-2 text-right">{formatIDR(r.totalValue)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MarginReport() {
  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "invoices", "report"],
    queryFn: () => inventoryApi.listInvoices({ pageSize: 200 }),
  });
  const invoices = data?.invoices ?? [];

  const totals = useMemo(() => {
    const rev = invoices.reduce((s, i) => s + i.subtotal, 0);
    const cogs = invoices.reduce((s, i) => s + i.totalCogs, 0);
    return { rev, cogs, margin: rev - cogs };
  }, [invoices]);

  const exportCSV = () => {
    downloadCSV(
      `margin-penjualan-${new Date().toISOString().slice(0, 10)}.csv`,
      ["No Faktur", "Tanggal", "Pendapatan", "HPP", "Margin", "Margin %"],
      invoices.map((i) => {
        const margin = i.subtotal - i.totalCogs;
        const pct = i.subtotal > 0 ? ((margin / i.subtotal) * 100).toFixed(1) : "0";
        return [i.invoiceNo, i.transactionDate, i.subtotal, i.totalCogs, margin, pct];
      }),
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="py-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Pendapatan</p><p className="mt-1 text-xl font-semibold">{formatIDR(totals.rev)}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">HPP</p><p className="mt-1 text-xl font-semibold">{formatIDR(totals.cogs)}</p></CardContent></Card>
        <Card><CardContent className="py-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">Margin</p><p className="mt-1 text-xl font-semibold text-emerald-700">{formatIDR(totals.margin)}</p></CardContent></Card>
        <div className="flex items-center"><Button variant="outline" onClick={exportCSV} disabled={invoices.length === 0}>Export CSV</Button></div>
      </div>

      <Card>
        <CardHeader><CardTitle>Margin per Faktur</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">Margin = pendapatan faktur − HPP. Buat faktur dari pesanan agar muncul di sini.</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">No Faktur</th>
                  <th className="px-3 py-2 text-left">Tanggal</th>
                  <th className="px-3 py-2 text-right">Pendapatan</th>
                  <th className="px-3 py-2 text-right">HPP</th>
                  <th className="px-3 py-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Memuat...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Belum ada faktur.</td></tr>
                ) : (
                  invoices.map((i) => {
                    const margin = i.subtotal - i.totalCogs;
                    const pct = i.subtotal > 0 ? (margin / i.subtotal) * 100 : 0;
                    return (
                      <tr key={i.id}>
                        <td className="px-3 py-2 font-medium">{i.invoiceNo}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{i.transactionDate}</td>
                        <td className="px-3 py-2 text-right">{formatIDR(i.subtotal)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{formatIDR(i.totalCogs)}</td>
                        <td className={cn("px-3 py-2 text-right font-medium", margin >= 0 ? "text-emerald-700" : "text-red-700")}>
                          {formatIDR(margin)} <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
