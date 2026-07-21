"use client";

import { Suspense, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InventoryPageHeader } from "@/components/inventory/inventory-help";
import { InventoryDataTablePagination } from "@/components/inventory/data-table-pagination";
import { WarehouseSelect } from "@/components/inventory/warehouse-select";
import { ItemPicker, type PickedItem } from "@/components/inventory/item-picker";
import { InventoryRefDocLink } from "@/components/inventory/inventory-ref-doc-link";
import { StockTransactionEditDialog } from "@/components/inventory/stock-transaction-edit-dialog";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { inventoryApi, formatIDR, formatStockQty, movementTypeLabel } from "@/lib/api/inventory";
import { toApiError } from "@/lib/api/client";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { tenantQueryKey } from "@/lib/query/tenant-query-key";
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
  const tenantKey = useTenantKey();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialItemId = searchParams.get("catalogItemId") ?? "";

  const [pickedItem, setPickedItem] = useState<PickedItem | null>(
    initialItemId ? { id: initialItemId, name: "Produk", externalCode: "" } : null,
  );
  const catalogItemId = pickedItem?.id ?? "";

  const [warehouseId, setWarehouseId] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [stockTxnId, setStockTxnId] = useState<string | null>(null);

  const onItemChange = useCallback((item: PickedItem | null) => {
    setPickedItem(item);
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (item?.id) params.set("catalogItemId", item.id);
    else params.delete("catalogItemId");
    router.replace(`/dashboard/inventory/movements?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "movements", catalogItemId, warehouseId, type, searchQ, page, pageSize),
    queryFn: ({ signal }) => inventoryApi.listMovements({
      catalogItemId,
      warehouseId: warehouseId || undefined,
      type: type || undefined,
      q: searchQ || undefined,
      page,
      pageSize,
    }, signal),
    enabled: Boolean(catalogItemId),
    retry: 1,
  });
  const rows = data?.movements ?? [];
  const total = data?.total ?? 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col gap-3">
          <CardTitle>Kartu Stok / Pergerakan</CardTitle>
          <p className="text-sm text-muted-foreground">Pilih produk dulu untuk melihat kartu stok per SKU.</p>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[220px] flex-1">
              <ItemPicker value={pickedItem} onChange={onItemChange} placeholder="Pilih produk / SKU..." />
            </div>
            <Input
              placeholder="Cari no transaksi..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { setSearchQ(q); setPage(1); }
              }}
              className="w-52"
              disabled={!catalogItemId}
            />
            <WarehouseSelect
              value={warehouseId}
              onChange={(v) => { setWarehouseId(v); setPage(1); }}
              placeholder="Semua gudang"
              className="h-9 w-40 rounded-md border border-input bg-background px-3 text-sm"
              disabled={!catalogItemId}
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
              value={type}
              onChange={(e) => { setType(e.target.value); setPage(1); }}
              disabled={!catalogItemId}
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
          {!catalogItemId ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Pilih produk di atas untuk menampilkan pergerakan stok.
            </p>
          ) : (
            <InventoryTable>
              <InventoryTableHeader>
                <InventoryTableRow>
                  <InventoryTableHead>Tanggal</InventoryTableHead>
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
                  <InventoryTableEmpty colSpan={7}>Memuat...</InventoryTableEmpty>
                ) : isError ? (
                  <InventoryTableEmpty colSpan={7}>Gagal memuat: {toApiError(error).message}</InventoryTableEmpty>
                ) : rows.length === 0 ? (
                  <InventoryTableEmpty colSpan={7}>Belum ada pergerakan untuk produk ini.</InventoryTableEmpty>
                ) : (
                  rows.map((m) => (
                    <InventoryTableRow key={m.id}>
                      <InventoryTableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(m.createdAt).toLocaleString("id-ID")}
                      </InventoryTableCell>
                      <InventoryTableCell>{m.warehouseName}</InventoryTableCell>
                      <InventoryTableCell>
                        {m.refDocNo ? (
                          <div>
                            <InventoryRefDocLink
                              docNo={m.refDocNo}
                              refType={m.refType}
                              refId={m.refId}
                              onOpenStockTxn={setStockTxnId}
                            />
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
          )}
          {catalogItemId ? (
            <InventoryDataTablePagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            />
          ) : null}
        </CardContent>
      </Card>

      <StockTransactionEditDialog id={stockTxnId} onClose={() => setStockTxnId(null)} />
    </>
  );
}

export default function MovementsPage() {
  return (
    <RequireTenantDashboard title="Pergerakan Stok">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/dashboard/inventory">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Kembali ke Stok
          </Link>
        </Button>
      </div>
      <InventoryPageHeader title="Pergerakan Stok" description="Buku besar stok per SKU — pilih produk dulu." helpTopic="movements" />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Memuat...</p>}>
        <MovementsContent />
      </Suspense>
    </RequireTenantDashboard>
  );
}
