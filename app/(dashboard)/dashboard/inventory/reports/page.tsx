"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InventoryPageHeader } from "@/components/inventory/inventory-help";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { inventoryApi, formatIDR, formatStockQty } from "@/lib/api/inventory";
import {
  InventoryTable,
  InventoryTableBody,
  InventoryTableCell,
  InventoryTableEmpty,
  InventoryTableHead,
  InventoryTableHeader,
  InventoryTableRow,
} from "@/components/inventory/inventory-table";
import { downloadCSV } from "@/lib/inventory/csv";
import { cn } from "@/lib/utils";
import { InventoryDataTablePagination } from "@/components/inventory/data-table-pagination";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";

type Tab = "valuation" | "margin";

export default function InventoryReportsPage() {
  const [tab, setTab] = useState<Tab>("valuation");
  return (
    <RequireTenantDashboard title="Laporan Persediaan">
      <InventoryPageHeader title="Laporan Persediaan" description="Nilai persediaan dan margin penjualan (revenue − HPP)." helpTopic="reports" />
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
  const tenantKey = useTenantKey();
  const [page, setPage] = useState(1);
  const pageSize = 100;
  const { data, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "stock", "report", page, pageSize),
    queryFn: ({ signal }) => inventoryApi.listStock({ page, pageSize }, signal),
  });
  const rows = data?.stock ?? [];
  const total = data?.total ?? 0;
  const pageTotal = rows.reduce((s, r) => s + r.totalValue, 0);

  const byWarehouse = (() => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.warehouseName, (m.get(r.warehouseName) ?? 0) + r.totalValue);
    return [...m.entries()];
  })();

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
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Nilai persediaan (halaman ini)</p>
            <p className="mt-1 text-2xl font-semibold">{formatIDR(pageTotal)}</p>
            {total > rows.length ? (
              <p className="mt-1 text-xs text-muted-foreground">{total} baris total — gunakan pagination untuk melihat semua.</p>
            ) : null}
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
          <InventoryTable>
            <InventoryTableHeader>
              <InventoryTableRow>
                <InventoryTableHead>Produk</InventoryTableHead>
                <InventoryTableHead>Gudang</InventoryTableHead>
                <InventoryTableHead align="right">On hand</InventoryTableHead>
                <InventoryTableHead align="right">HPP/unit</InventoryTableHead>
                <InventoryTableHead align="right">Nilai</InventoryTableHead>
              </InventoryTableRow>
            </InventoryTableHeader>
            <InventoryTableBody>
              {isLoading ? (
                <InventoryTableEmpty colSpan={5}>Memuat...</InventoryTableEmpty>
              ) : rows.length === 0 ? (
                <InventoryTableEmpty colSpan={5}>Belum ada data.</InventoryTableEmpty>
              ) : (
                rows.map((r) => (
                  <InventoryTableRow key={`${r.catalogItemId}-${r.warehouseId}`}>
                    <InventoryTableCell>{r.itemName}</InventoryTableCell>
                    <InventoryTableCell>{r.warehouseName}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatStockQty(r.onHand)}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatIDR(r.avgUnitCost)}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatIDR(r.totalValue)}</InventoryTableCell>
                  </InventoryTableRow>
                ))
              )}
            </InventoryTableBody>
          </InventoryTable>
          <InventoryDataTablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function MarginReport() {
  const tenantKey = useTenantKey();
  const { data, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "invoices", "report"),
    queryFn: ({ signal }) => inventoryApi.listInvoices({ pageSize: 200 }, signal),
  });
  const invoices = data?.invoices ?? [];

  const rev = invoices.reduce((s, i) => s + i.subtotal, 0);
  const cogs = invoices.reduce((s, i) => s + i.totalCogs, 0);
  const totals = { rev, cogs, margin: rev - cogs };

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
          <InventoryTable>
            <InventoryTableHeader>
              <InventoryTableRow>
                <InventoryTableHead>No Faktur</InventoryTableHead>
                <InventoryTableHead>Tanggal</InventoryTableHead>
                <InventoryTableHead align="right">Pendapatan</InventoryTableHead>
                <InventoryTableHead align="right">HPP</InventoryTableHead>
                <InventoryTableHead align="right">Margin</InventoryTableHead>
              </InventoryTableRow>
            </InventoryTableHeader>
            <InventoryTableBody>
              {isLoading ? (
                <InventoryTableEmpty colSpan={5}>Memuat...</InventoryTableEmpty>
              ) : invoices.length === 0 ? (
                <InventoryTableEmpty colSpan={5}>Belum ada faktur.</InventoryTableEmpty>
              ) : (
                invoices.map((i) => {
                  const margin = i.subtotal - i.totalCogs;
                  const pct = i.subtotal > 0 ? (margin / i.subtotal) * 100 : 0;
                  return (
                    <InventoryTableRow key={i.id}>
                      <InventoryTableCell className="font-medium">{i.invoiceNo}</InventoryTableCell>
                      <InventoryTableCell className="text-xs text-muted-foreground">{i.transactionDate}</InventoryTableCell>
                      <InventoryTableCell align="right">{formatIDR(i.subtotal)}</InventoryTableCell>
                      <InventoryTableCell align="right" className="text-muted-foreground">{formatIDR(i.totalCogs)}</InventoryTableCell>
                      <InventoryTableCell align="right" className={cn("font-medium", margin >= 0 ? "text-emerald-700" : "text-red-700")}>
                        {formatIDR(margin)} <span className="text-xs text-muted-foreground">({pct.toFixed(0)}%)</span>
                      </InventoryTableCell>
                    </InventoryTableRow>
                  );
                })
              )}
            </InventoryTableBody>
          </InventoryTable>
        </CardContent>
      </Card>
    </div>
  );
}
