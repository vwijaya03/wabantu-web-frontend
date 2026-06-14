"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { inventoryApi, formatIDR, formatStockQty } from "@/lib/api/inventory";

export default function InventoryStockPage() {
  const [q, setQ] = useState("");
  const [warehouseId, setWarehouseId] = useState("");

  const { data: setting } = useQuery({
    queryKey: ["inventory", "setting"],
    queryFn: () => inventoryApi.getSetting(),
  });
  const { data: warehousesData } = useQuery({
    queryKey: ["inventory", "warehouses"],
    queryFn: () => inventoryApi.listWarehouses(),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "stock", q, warehouseId],
    queryFn: () => inventoryApi.listStock({ q, warehouseId, pageSize: 100 }),
  });

  const warehouses = warehousesData?.warehouses ?? [];
  const rows = data?.stock ?? [];
  const totalValue = rows.reduce((sum, r) => sum + r.totalValue, 0);

  return (
    <RequireTenantDashboard title="Stok">
      <PageHeader
        title="Stok Persediaan"
        description="Saldo stok dan nilai persediaan per gudang."
      />

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
          <div className="flex flex-wrap gap-2">
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-3 text-sm text-muted-foreground">
            Total nilai persediaan: <span className="font-semibold text-foreground">{formatIDR(totalValue)}</span>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Produk</th>
                  <th className="px-3 py-2 text-left">Gudang</th>
                  <th className="px-3 py-2 text-right">On hand</th>
                  <th className="px-3 py-2 text-right">Tersedia</th>
                  <th className="px-3 py-2 text-right">HPP/unit</th>
                  <th className="px-3 py-2 text-right">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Memuat...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Belum ada stok.</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={`${r.catalogItemId}-${r.warehouseId}`} className="hover:bg-muted/40">
                      <td className="px-3 py-2">
                        <Link
                          href={`/dashboard/inventory/movements?catalogItemId=${r.catalogItemId}`}
                          className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                          {r.itemName || r.externalCode || "Produk"}
                        </Link>
                        <p className="text-xs text-muted-foreground">{r.externalCode}</p>
                      </td>
                      <td className="px-3 py-2">{r.warehouseName}</td>
                      <td className="px-3 py-2 text-right">{formatStockQty(r.onHand)}</td>
                      <td className="px-3 py-2 text-right">
                        {r.reserved > 0 ? (
                          <Badge variant="secondary">{formatStockQty(r.available)}</Badge>
                        ) : (
                          formatStockQty(r.available)
                        )}
                      </td>
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
    </RequireTenantDashboard>
  );
}
