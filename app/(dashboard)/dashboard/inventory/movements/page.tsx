"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InventoryPageHeader } from "@/components/inventory/inventory-help";
import { InventoryDataTablePagination } from "@/components/inventory/data-table-pagination";
import { WarehouseSelect } from "@/components/inventory/warehouse-select";
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
  const catalogItemId = searchParams.get("catalogItemId") ?? "";
  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "movements", catalogItemId, warehouseId, type, searchQ, page, pageSize],
    queryFn: () => inventoryApi.listMovements({
      catalogItemId: catalogItemId || undefined,
      warehouseId: warehouseId || undefined,
      type: type || undefined,
      q: searchQ || undefined,
      page,
      pageSize,
    }),
  });
  const rows = data?.movements ?? [];
  const total = data?.total ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <CardTitle>Kartu Stok / Pergerakan</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Cari produk / no transaksi..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { setSearchQ(q); setPage(1); }
            }}
            className="w-52"
          />
          <WarehouseSelect value={warehouseId} onChange={(v) => { setWarehouseId(v); setPage(1); }} placeholder="Semua gudang" className="h-9 w-40 rounded-md border border-input bg-background px-3 text-sm" />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
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
        </div>
      </CardHeader>
      <CardContent>
        <InventoryTable>
          <InventoryTableHeader>
            <InventoryTableRow>
              <InventoryTableHead>Tanggal</InventoryTableHead>
              <InventoryTableHead>Produk</InventoryTableHead>
              <InventoryTableHead>Gudang</InventoryTableHead>
              <InventoryTableHead>Sumber</InventoryTableHead>
              <InventoryTableHead>Tipe</InventoryTableHead>
              <InventoryTableHead align="right">Qty</InventoryTableHead>
              <InventoryTableHead align="right">HPP/unit</InventoryTableHead>
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
                    {m.refDocNo ? (
                      <div>
                        <span className="font-mono text-xs font-medium">{m.refDocNo}</span>
                        {m.refKind ? <p className="text-xs text-muted-foreground">{m.refKind}</p> : null}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </InventoryTableCell>
                  <InventoryTableCell>
                    <Badge variant={m.direction === "in" ? "success" : "secondary"}>{movementTypeLabel(m.movementType)}</Badge>
                  </InventoryTableCell>
                  <InventoryTableCell align="right">
                    {m.direction === "in" ? "+" : "-"}{formatStockQty(m.qty)}
                  </InventoryTableCell>
                  <InventoryTableCell align="right">{formatIDR(m.unitCost)}</InventoryTableCell>
                  <InventoryTableCell align="right">{formatStockQty(m.qtyAfter)}</InventoryTableCell>
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
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </CardContent>
    </Card>
  );
}

export default function MovementsPage() {
  return (
    <RequireTenantDashboard title="Pergerakan Stok">
      <InventoryPageHeader title="Pergerakan Stok" description="Buku besar stok: semua mutasi & HPP per transaksi." helpTopic="movements" />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat...</p>}>
        <MovementsContent />
      </Suspense>
    </RequireTenantDashboard>
  );
}
