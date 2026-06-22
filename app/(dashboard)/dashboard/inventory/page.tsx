"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InventoryPageHeader } from "@/components/inventory/inventory-help";
import { InventoryGettingStarted } from "@/components/inventory/inventory-getting-started";
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
import { cn } from "@/lib/utils";

export default function InventoryStockPage() {
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const { data: setting } = useQuery({
    queryKey: ["inventory", "setting"],
    queryFn: () => inventoryApi.getSetting(),
  });
  const { data: warehousesData } = useQuery({
    queryKey: ["inventory", "warehouses", "all"],
    queryFn: () => inventoryApi.listWarehouses({ all: true }),
  });
  const { data: stockOverview } = useQuery({
    queryKey: ["inventory", "stock", "overview-total"],
    queryFn: () => inventoryApi.listStock({ page: 1, pageSize: 1 }),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "stock", searchQ, warehouseId],
    queryFn: () => inventoryApi.listStock({ q: searchQ, warehouseId, pageSize: 100 }),
  });

  const warehouses = warehousesData?.warehouses ?? [];
  const rows = data?.stock ?? [];
  const stockRowCount = stockOverview?.total ?? 0;
  const totalValue = rows.reduce((sum, r) => sum + r.totalValue, 0);
  const outOfStock = rows.filter((r) => r.available <= 0).length;

  return (
    <RequireTenantDashboard title="Stok">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <InventoryPageHeader
          title="Stok Persediaan"
          description="Saldo stok dan nilai persediaan per gudang."
          helpTopic="stock"
        />
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/inventory/guide">Panduan Pemula</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/inventory/movements">Kartu Stok</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/inventory/adjustments">Penyesuaian Stok</Link>
          </Button>
        </div>
      </div>

      <InventoryGettingStarted
        setupCompleted={setting?.setupCompleted ?? false}
        warehouseCount={setting?.warehouseCount ?? warehouses.length}
        stockRowCount={stockRowCount}
      />

      <div className="my-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Nilai persediaan</p>
            <p className="mt-1 text-2xl font-semibold">{formatIDR(totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Baris stok</p>
            <p className="mt-1 text-2xl font-semibold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card className={outOfStock > 0 ? "border-red-300 bg-red-50" : undefined}>
          <CardContent className="py-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Stok habis</p>
            <p className={cn("mt-1 text-2xl font-semibold", outOfStock > 0 && "text-red-700")}>{outOfStock}</p>
          </CardContent>
        </Card>
      </div>

      {setting && !setting.setupCompleted ? (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-amber-900">Setup persediaan belum selesai</p>
              <p className="text-sm text-amber-800">
                Fitur stok pada pesanan baru aktif setelah setup selesai. Atur metode HPP & gudang dulu.
              </p>
            </div>
            <Button asChild>
              <Link href="/dashboard/inventory/setup">Mulai Setup</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Daftar Stok</CardTitle>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSearchQ(q.trim());
            }}
          >
            <Input
              placeholder="Cari produk / kode..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-56"
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              <option value="">Semua gudang</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              Cari
            </Button>
            {searchQ ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setQ("");
                  setSearchQ("");
                }}
              >
                Reset
              </Button>
            ) : null}
          </form>
        </CardHeader>
        <CardContent>
          <InventoryTable>
            <InventoryTableHeader>
              <InventoryTableRow>
                <InventoryTableHead>Produk</InventoryTableHead>
                <InventoryTableHead>Gudang</InventoryTableHead>
                <InventoryTableHead align="right">On hand</InventoryTableHead>
                <InventoryTableHead align="right">Tersedia</InventoryTableHead>
                <InventoryTableHead align="right">HPP/unit</InventoryTableHead>
                <InventoryTableHead align="right">Nilai</InventoryTableHead>
              </InventoryTableRow>
            </InventoryTableHeader>
            <InventoryTableBody>
              {isLoading ? (
                <InventoryTableEmpty colSpan={6}>Memuat...</InventoryTableEmpty>
              ) : rows.length === 0 ? (
                <InventoryTableEmpty colSpan={6}>
                  {searchQ ? "Tidak ada stok cocok." : "Belum ada stok."}
                </InventoryTableEmpty>
              ) : (
                rows.map((r) => (
                  <InventoryTableRow key={`${r.catalogItemId}-${r.warehouseId}`}>
                    <InventoryTableCell>
                      <Link
                        href={`/dashboard/inventory/movements?catalogItemId=${r.catalogItemId}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {r.itemName || r.externalCode || "Produk"}
                      </Link>
                      <p className="text-xs text-muted-foreground">{r.externalCode}</p>
                    </InventoryTableCell>
                    <InventoryTableCell>{r.warehouseName}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatStockQty(r.onHand)}</InventoryTableCell>
                    <InventoryTableCell align="right">
                      {r.available <= 0 ? (
                        <Badge variant="destructive">Habis</Badge>
                      ) : r.reserved > 0 ? (
                        <Badge variant="secondary">{formatStockQty(r.available)} tersedia</Badge>
                      ) : (
                        formatStockQty(r.available)
                      )}
                    </InventoryTableCell>
                    <InventoryTableCell align="right">{formatIDR(r.avgUnitCost)}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatIDR(r.totalValue)}</InventoryTableCell>
                  </InventoryTableRow>
                ))
              )}
            </InventoryTableBody>
          </InventoryTable>
        </CardContent>
      </Card>
    </RequireTenantDashboard>
  );
}
