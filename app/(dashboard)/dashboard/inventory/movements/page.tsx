"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { inventoryApi, formatIDR, formatStockQty, movementTypeLabel } from "@/lib/api/inventory";

function MovementsContent() {
  const searchParams = useSearchParams();
  const initialItem = searchParams.get("catalogItemId") ?? "";
  const [catalogItemId] = useState(initialItem);
  const [type, setType] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "movements", catalogItemId, type],
    queryFn: () => inventoryApi.listMovements({ catalogItemId, type, pageSize: 100 }),
  });
  const rows = data?.movements ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Kartu Stok / Pergerakan</CardTitle>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">Semua tipe</option>
          <option value="opening_balance">Saldo awal</option>
          <option value="purchase_receive">Penerimaan</option>
          <option value="sale_issue">Penjualan keluar</option>
          <option value="sale_cancel_restore">Batal pesanan</option>
          <option value="return_in">Retur masuk</option>
          <option value="adjustment_plus">Penyesuaian +</option>
          <option value="adjustment_minus">Penyesuaian -</option>
          <option value="transfer_out">Transfer keluar</option>
          <option value="transfer_in">Transfer masuk</option>
          <option value="revaluation_cost">Revaluasi HPP</option>
        </select>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Tanggal</th>
                <th className="px-3 py-2 text-left">Produk</th>
                <th className="px-3 py-2 text-left">Gudang</th>
                <th className="px-3 py-2 text-left">Tipe</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">HPP/unit</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Memuat...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Belum ada pergerakan.</td></tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.id} className="hover:bg-muted/40">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2">{m.itemName}</td>
                    <td className="px-3 py-2">{m.warehouseName}</td>
                    <td className="px-3 py-2">
                      <Badge variant={m.direction === "in" ? "success" : "secondary"}>{movementTypeLabel(m.movementType)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {m.direction === "in" ? "+" : "-"}{formatStockQty(m.qty)}
                    </td>
                    <td className="px-3 py-2 text-right">{formatIDR(m.unitCost)}</td>
                    <td className="px-3 py-2 text-right">{formatIDR(m.totalCost)}</td>
                    <td className="px-3 py-2 text-right">{formatStockQty(m.qtyAfter)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MovementsPage() {
  return (
    <RequireTenantDashboard title="Pergerakan Stok">
      <PageHeader title="Pergerakan Stok" description="Buku besar stok: semua mutasi & HPP per transaksi." />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat...</p>}>
        <MovementsContent />
      </Suspense>
    </RequireTenantDashboard>
  );
}
