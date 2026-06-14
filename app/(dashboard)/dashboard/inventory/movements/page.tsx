"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { inventoryApi, formatIDR, formatStockQty, movementTypeLabel } from "@/lib/api/inventory";
import {
  InventoryTable,
  InventoryTableBody,
  InventoryTableCell,
  InventoryTableEmpty,
  InventoryTableHead,
  InventoryTableHeader,
  InventoryTableRow,
} from "@/components/inventory/inventory-table";

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
        <InventoryTable>
          <InventoryTableHeader>
            <InventoryTableRow>
              <InventoryTableHead>Tanggal</InventoryTableHead>
              <InventoryTableHead>Produk</InventoryTableHead>
              <InventoryTableHead>Gudang</InventoryTableHead>
              <InventoryTableHead>Tipe</InventoryTableHead>
              <InventoryTableHead align="right">Qty</InventoryTableHead>
              <InventoryTableHead align="right">HPP/unit</InventoryTableHead>
              <InventoryTableHead align="right">Total</InventoryTableHead>
              <InventoryTableHead align="right">Saldo</InventoryTableHead>
            </InventoryTableRow>
          </InventoryTableHeader>
          <InventoryTableBody>
            {isLoading ? (
              <InventoryTableEmpty colSpan={8}>Memuat...</InventoryTableEmpty>
            ) : rows.length === 0 ? (
              <InventoryTableEmpty colSpan={8}>Belum ada pergerakan.</InventoryTableEmpty>
            ) : (
              rows.map((m) => (
                <InventoryTableRow key={m.id}>
                  <InventoryTableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleString("id-ID")}
                  </InventoryTableCell>
                  <InventoryTableCell>{m.itemName}</InventoryTableCell>
                  <InventoryTableCell>{m.warehouseName}</InventoryTableCell>
                  <InventoryTableCell>
                    <Badge variant={m.direction === "in" ? "success" : "secondary"}>{movementTypeLabel(m.movementType)}</Badge>
                  </InventoryTableCell>
                  <InventoryTableCell align="right">
                    {m.direction === "in" ? "+" : "-"}{formatStockQty(m.qty)}
                  </InventoryTableCell>
                  <InventoryTableCell align="right">{formatIDR(m.unitCost)}</InventoryTableCell>
                  <InventoryTableCell align="right">{formatIDR(m.totalCost)}</InventoryTableCell>
                  <InventoryTableCell align="right">{formatStockQty(m.qtyAfter)}</InventoryTableCell>
                </InventoryTableRow>
              ))
            )}
          </InventoryTableBody>
        </InventoryTable>
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
