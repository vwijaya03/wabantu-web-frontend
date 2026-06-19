"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InventoryPageHeader } from "@/components/inventory/inventory-help";
import { InventoryDataTablePagination } from "@/components/inventory/data-table-pagination";
import { TransactionDocLink } from "@/components/inventory/transaction-doc-link";
import { InventoryOpenDetailSuspense } from "@/components/inventory/use-inventory-open-detail";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { OrderPicker } from "@/components/inventory/order-picker";
import { BulkSalesReturnPanel } from "@/components/inventory/bulk-sales-return-panel";
import { InventoryFormModeSwitch } from "@/components/inventory/inventory-form-mode-switch";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
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
import { type Order } from "@/lib/api/orders";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

export default function SalesReturnsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const [order, setOrder] = useState<Order | null>(null);
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [createMode, setCreateMode] = useState<"single" | "bulk">("single");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "sales-returns", searchQ, page, pageSize],
    queryFn: () => inventoryApi.listSalesReturns({ q: searchQ || undefined, page, pageSize }),
  });
  const returns = data?.salesReturns ?? [];

  const reset = () => { setOrder(null); setQtys({}); setNote(""); };

  const createMut = useMutation({
    mutationFn: () =>
      inventoryApi.createSalesReturn({
        orderId: order!.id,
        note: note || undefined,
        lines: (order!.items ?? [])
          .filter((it) => it.catalogItemId && Number(qtys[it.catalogItemId!]) > 0)
          .map((it) => ({ catalogItemId: it.catalogItemId!, qty: Number(qtys[it.catalogItemId!]) })),
      }),
    onSuccess: (r) => {
      toast.success(`Retur ${r.returnNo} tersimpan — stok kembali`);
      reset();
      void qc.invalidateQueries({ queryKey: ["inventory", "sales-returns"] });
      void qc.invalidateQueries({ queryKey: ["inventory", "stock"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const returnableItems = (order?.items ?? []).filter((it) => it.catalogItemId);
  const hasQty = returnableItems.some((it) => Number(qtys[it.catalogItemId!]) > 0);

  return (
    <RequireTenantDashboard title="Retur Penjualan">
      <InventoryPageHeader title="Retur Penjualan" description="Barang kembali dari pelanggan — stok masuk lagi dengan HPP asli." helpTopic="sales-returns" />

      {canManage ? (
        <Card className="mb-4">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Buat Retur</CardTitle>
            <InventoryFormModeSwitch mode={createMode} onChange={setCreateMode} />
          </CardHeader>
          <CardContent>
            {createMode === "single" ? (
              <div className="space-y-4">
                <div className="space-y-1.5"><Label>Pesanan</Label><OrderPicker value={order} onChange={(o) => { setOrder(o); setQtys({}); }} /></div>
                {order && returnableItems.length > 0 ? (
                  <div className="space-y-2">
                    <Label>Jumlah diretur per produk</Label>
                    {returnableItems.map((it) => (
                      <div key={it.catalogItemId} className="grid grid-cols-[1fr_120px] items-center gap-2 rounded border p-2 text-sm">
                        <div>
                          <p className="font-medium">{it.name}</p>
                          <p className="text-xs text-muted-foreground">Dipesan: {formatStockQty(it.qty)}</p>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          max={it.qty}
                          step="any"
                          placeholder="0"
                          value={qtys[it.catalogItemId!] ?? ""}
                          onChange={(e) => setQtys((q) => ({ ...q, [it.catalogItemId!]: e.target.value }))}
                        />
                      </div>
                    ))}
                    <div className="space-y-1.5"><Label>Catatan (opsional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
                    <Button onClick={() => createMut.mutate()} disabled={!hasQty || createMut.isPending}>
                      {createMut.isPending ? "Memproses..." : "Simpan Retur"}
                    </Button>
                  </div>
                ) : order ? (
                  <p className="text-sm text-muted-foreground">Pesanan ini tidak punya item yang bisa diretur.</p>
                ) : null}
              </div>
            ) : (
              <BulkSalesReturnPanel embedded />
            )}
          </CardContent>
        </Card>
      ) : null}

      <InventoryOpenDetailSuspense setDetailId={setDetailId} />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Daftar Retur</CardTitle>
          <Input
            placeholder="Cari no retur..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearchQ(q); setPage(1); } }}
            className="w-44"
          />
        </CardHeader>
        <CardContent>
          <InventoryTable>
            <InventoryTableHeader>
              <InventoryTableRow>
                <InventoryTableHead>No Retur</InventoryTableHead>
                <InventoryTableHead align="right">Nilai HPP</InventoryTableHead>
                <InventoryTableHead>Tanggal</InventoryTableHead>
              </InventoryTableRow>
            </InventoryTableHeader>
            <InventoryTableBody>
              {isLoading ? (
                <InventoryTableEmpty colSpan={3}>Memuat...</InventoryTableEmpty>
              ) : returns.length === 0 ? (
                <InventoryTableEmpty colSpan={3}>Belum ada retur.</InventoryTableEmpty>
              ) : (
                returns.map((r) => (
                  <InventoryTableRow key={r.id} className="cursor-pointer" onClick={() => setDetailId(r.id)}>
                    <InventoryTableCell>
                      <TransactionDocLink docNo={r.returnNo} onClick={() => setDetailId(r.id)} />
                    </InventoryTableCell>
                    <InventoryTableCell align="right">{formatIDR(r.totalCost)}</InventoryTableCell>
                    <InventoryTableCell className="text-xs text-muted-foreground">{r.transactionDate}</InventoryTableCell>
                  </InventoryTableRow>
                ))
              )}
            </InventoryTableBody>
          </InventoryTable>
          <InventoryDataTablePagination
            page={page}
            pageSize={pageSize}
            total={data?.total ?? 0}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          />
        </CardContent>
      </Card>

      <ReturnDetailDialog id={detailId} canManage={canManage} onClose={() => setDetailId(null)} />
    </RequireTenantDashboard>
  );
}

function ReturnDetailDialog({ id, canManage, onClose }: { id: string | null; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: r } = useQuery({
    queryKey: ["inventory", "sales-return", id],
    queryFn: () => inventoryApi.getSalesReturn(id!),
    enabled: Boolean(id),
  });
  const delMut = useMutation({
    mutationFn: () => inventoryApi.deleteSalesReturn(id!),
    onSuccess: () => {
      toast.success("Retur dihapus — stok disesuaikan");
      onClose();
      void qc.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (e) => toast.error(toApiError(e).message),
  });
  return (
    <Dialog open={Boolean(id)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{r ? r.returnNo : "Memuat..."}</DialogTitle>
          <DialogDescription className="sr-only">Detail retur penjualan</DialogDescription>
        </DialogHeader>
        {r ? (
          <div className="space-y-3">
            {canManage ? (
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={delMut.isPending}
                  onClick={() => { if (confirm(`Hapus retur ${r.returnNo}? Stok akan dikurangi.`)) delMut.mutate(); }}
                >
                  Hapus
                </Button>
              </div>
            ) : null}
            <InventoryTable>
              <InventoryTableHeader>
                <InventoryTableRow>
                  <InventoryTableHead>Produk</InventoryTableHead>
                  <InventoryTableHead align="right">Qty</InventoryTableHead>
                  <InventoryTableHead align="right">HPP/unit</InventoryTableHead>
                </InventoryTableRow>
              </InventoryTableHeader>
              <InventoryTableBody>
                {r.lines.map((l, i) => (
                  <InventoryTableRow key={i}>
                    <InventoryTableCell>{l.itemName || l.catalogItemId}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatStockQty(l.qty)}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatIDR(l.unitCost)}</InventoryTableCell>
                  </InventoryTableRow>
                ))}
              </InventoryTableBody>
            </InventoryTable>
            <p className="text-right text-sm">Total HPP kembali: <span className="font-semibold">{formatIDR(r.totalCost)}</span></p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
