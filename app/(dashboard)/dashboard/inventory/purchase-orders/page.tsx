"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InventoryPageHeader } from "@/components/inventory/inventory-help";
import { InventoryDataTablePagination } from "@/components/inventory/data-table-pagination";
import { TransactionDocLink } from "@/components/inventory/transaction-doc-link";
import { InventoryOpenDetailSuspense } from "@/components/inventory/use-inventory-open-detail";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { ItemPicker, type PickedItem } from "@/components/inventory/item-picker";
import { WarehouseSelect } from "@/components/inventory/warehouse-select";
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
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { invalidateTenantQueries, tenantQueryKey } from "@/lib/query/tenant-query-key";

type DraftLine = { item: PickedItem | null; qtyOrdered: string; unitCost: string };

function poStatusBadge(status: string) {
  const map: Record<string, "secondary" | "success" | "warning" | "destructive"> = {
    open: "warning",
    partial: "warning",
    received: "success",
    closed: "secondary",
    cancelled: "destructive",
  };
  const label: Record<string, string> = {
    open: "Terbuka",
    partial: "Sebagian diterima",
    received: "Diterima penuh",
    closed: "Ditutup",
    cancelled: "Dibatalkan",
  };
  return <Badge variant={map[status] ?? "secondary"}>{label[status] ?? status}</Badge>;
}

export default function PurchaseOrdersPage() {
  const qc = useQueryClient();
  const tenantKey = useTenantKey();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "purchase-orders", searchQ, page, pageSize),
    queryFn: ({ signal }) => inventoryApi.listPurchaseOrders({ q: searchQ || undefined, page, pageSize }, signal),
  });
  const orders = data?.purchaseOrders ?? [];

  return (
    <RequireTenantDashboard title="Purchase Order">
      <div className="flex items-center justify-between">
        <InventoryPageHeader title="Purchase Order" description="Rencana pembelian ke supplier. Stok masuk saat Penerimaan (Bill)." helpTopic="purchase-orders" />
        {canManage ? <Button onClick={() => setCreating((v) => !v)}>{creating ? "Tutup" : "Buat PO"}</Button> : null}
      </div>

      {creating ? <CreatePOPanel onDone={() => { setCreating(false); invalidateTenantQueries(qc, tenantKey, "inventory", "purchase-orders"); }} /> : null}

      <InventoryOpenDetailSuspense setDetailId={setDetailId} />

      <Card className="mt-4">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Daftar PO</CardTitle>
          <Input
            placeholder="Cari no PO / supplier..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setSearchQ(q); setPage(1); } }}
            className="w-52"
          />
        </CardHeader>
        <CardContent>
          <InventoryTable>
            <InventoryTableHeader>
              <InventoryTableRow>
                <InventoryTableHead>No PO</InventoryTableHead>
                <InventoryTableHead>Supplier</InventoryTableHead>
                <InventoryTableHead>Status</InventoryTableHead>
                <InventoryTableHead align="right">Total</InventoryTableHead>
                <InventoryTableHead>Tanggal</InventoryTableHead>
              </InventoryTableRow>
            </InventoryTableHeader>
            <InventoryTableBody>
              {isLoading ? (
                <InventoryTableEmpty colSpan={5}>Memuat...</InventoryTableEmpty>
              ) : orders.length === 0 ? (
                <InventoryTableEmpty colSpan={5}>Belum ada PO.</InventoryTableEmpty>
              ) : (
                orders.map((po) => (
                  <InventoryTableRow key={po.id} className="cursor-pointer" onClick={() => setDetailId(po.id)}>
                    <InventoryTableCell>
                      <TransactionDocLink docNo={po.poNo} onClick={() => setDetailId(po.id)} />
                    </InventoryTableCell>
                    <InventoryTableCell>{po.supplierName || "-"}</InventoryTableCell>
                    <InventoryTableCell>{poStatusBadge(po.status)}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatIDR(po.subtotal)}</InventoryTableCell>
                    <InventoryTableCell className="text-xs text-muted-foreground">{po.transactionDate}</InventoryTableCell>
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

      <PODetailDialog id={detailId} canManage={canManage} onClose={() => setDetailId(null)} />
    </RequireTenantDashboard>
  );
}

function CreatePOPanel({ onDone }: { onDone: () => void }) {
  const [supplierName, setSupplierName] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ item: null, qtyOrdered: "", unitCost: "" }]);

  const setLine = (i: number, patch: Partial<DraftLine>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { item: null, qtyOrdered: "", unitCost: "" }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const total = lines.reduce((s, l) => s + (Number(l.qtyOrdered) || 0) * (Number(l.unitCost) || 0), 0);
  const validLines = lines.filter((l) => l.item && Number(l.qtyOrdered) > 0);

  const mut = useMutation({
    mutationFn: () =>
      inventoryApi.createPurchaseOrder({
        supplierName: supplierName || undefined,
        warehouseId: warehouseId || undefined,
        lines: validLines.map((l) => ({ catalogItemId: l.item!.id, warehouseId: warehouseId || undefined, qtyOrdered: Number(l.qtyOrdered), unitCost: Number(l.unitCost) || 0 })),
      }),
    onSuccess: () => { toast.success("PO dibuat"); onDone(); },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <Card className="mt-4 border-primary/30">
      <CardHeader><CardTitle>Buat Purchase Order</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Supplier (opsional)</Label><Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Gudang tujuan</Label><WarehouseSelect value={warehouseId} onChange={setWarehouseId} /></div>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_110px_130px_auto] sm:items-end">
              <div className="space-y-1.5">{i === 0 ? <Label>Produk</Label> : null}<ItemPicker value={l.item} onChange={(it) => setLine(i, { item: it })} /></div>
              <div className="space-y-1.5">{i === 0 ? <Label>Qty</Label> : null}<Input type="number" min="0" step="any" value={l.qtyOrdered} onChange={(e) => setLine(i, { qtyOrdered: e.target.value })} /></div>
              <div className="space-y-1.5">{i === 0 ? <Label>Harga/unit</Label> : null}<Input type="number" min="0" step="any" value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} /></div>
              <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={lines.length === 1} onClick={() => removeLine(i)}>Hapus</Button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={addLine}>+ Baris</Button>
          <p className="text-sm">Total: <span className="font-semibold">{formatIDR(total)}</span></p>
        </div>
        <Button onClick={() => mut.mutate()} disabled={validLines.length === 0 || mut.isPending}>
          {mut.isPending ? "Menyimpan..." : "Simpan PO"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PODetailDialog({ id, canManage, onClose }: { id: string | null; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const tenantKey = useTenantKey();
  const [editing, setEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { data: po } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "purchase-order", id),
    queryFn: ({ signal }) => inventoryApi.getPurchaseOrder(id!, signal),
    enabled: Boolean(id),
  });

  const refresh = () => {
    invalidateTenantQueries(qc, tenantKey, "inventory", "purchase-orders");
    void qc.invalidateQueries({ queryKey: ["inventory", "purchase-order", id] });
  };
  const closeMut = useMutation({ mutationFn: () => inventoryApi.closePurchaseOrder(id!), onSuccess: () => { toast.success("PO ditutup"); refresh(); }, onError: (e) => toast.error(toApiError(e).message) });
  const cancelMut = useMutation({ mutationFn: () => inventoryApi.cancelPurchaseOrder(id!), onSuccess: () => { toast.success("PO dibatalkan"); refresh(); }, onError: (e) => toast.error(toApiError(e).message) });
  const delMut = useMutation({
    mutationFn: () => inventoryApi.deletePurchaseOrder(id!),
    onSuccess: () => {
      toast.success("PO dihapus");
      onClose();
      invalidateTenantQueries(qc, tenantKey, "inventory", "purchase-orders");
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const hasReceipts = (po?.lines ?? []).some((l) => (l.qtyReceived ?? 0) > 0);
  const canDelete = po && (po.status === "open" || po.status === "cancelled") && !hasReceipts;
  const canEdit = po && po.status === "open" && !hasReceipts;

  return (
    <>
    <Dialog open={Boolean(id)} onOpenChange={(o) => { if (!o) { setEditing(false); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{po ? `${po.poNo} · ${po.supplierName || "Tanpa supplier"}` : "Memuat..."}</DialogTitle>
          <DialogDescription className="sr-only">Detail purchase order</DialogDescription>
        </DialogHeader>
        {po ? (
          editing ? (
            <POEditForm
              po={po}
              onCancel={() => setEditing(false)}
              onSaved={() => { setEditing(false); refresh(); }}
            />
          ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">{poStatusBadge(po.status)}<span className="text-muted-foreground">{po.transactionDate}</span></div>
            <InventoryTable>
              <InventoryTableHeader>
                <InventoryTableRow>
                  <InventoryTableHead>Produk</InventoryTableHead>
                  <InventoryTableHead align="right">Dipesan</InventoryTableHead>
                  <InventoryTableHead align="right">Diterima</InventoryTableHead>
                  <InventoryTableHead align="right">Harga</InventoryTableHead>
                </InventoryTableRow>
              </InventoryTableHeader>
              <InventoryTableBody>
                {po.lines.map((l) => (
                  <InventoryTableRow key={l.id}>
                    <InventoryTableCell>{l.itemName}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatStockQty(l.qtyOrdered)}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatStockQty(l.qtyReceived ?? 0)}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatIDR(l.unitCost)}</InventoryTableCell>
                  </InventoryTableRow>
                ))}
              </InventoryTableBody>
            </InventoryTable>
            <p className="text-right text-sm">Total: <span className="font-semibold">{formatIDR(po.subtotal)}</span></p>
            <div className="flex flex-wrap justify-end gap-2">
              {canManage && canEdit ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit PO</Button>
              ) : null}
              {canManage && (po.status === "open" || po.status === "partial") ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>Batalkan</Button>
                  <Button variant="outline" size="sm" onClick={() => closeMut.mutate()} disabled={closeMut.isPending}>Tutup PO</Button>
                </>
              ) : null}
              {canManage && canDelete ? (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={delMut.isPending}
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  Hapus PO
                </Button>
              ) : null}
            </div>
          </div>
          )
        ) : null}
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={deleteConfirmOpen}
      onOpenChange={setDeleteConfirmOpen}
      title="Hapus PO?"
      description={po ? `PO ${po.poNo} akan dihapus permanen.` : undefined}
      confirmLabel="Hapus"
      destructive
      loading={delMut.isPending}
      onConfirm={() => {
        delMut.mutate();
        setDeleteConfirmOpen(false);
      }}
    />
    </>
  );
}

function POEditForm({ po, onCancel, onSaved }: { po: import("@/lib/api/inventory").PurchaseOrder; onCancel: () => void; onSaved: () => void }) {
  const [supplierName, setSupplierName] = useState(po.supplierName ?? "");
  const [warehouseId, setWarehouseId] = useState(po.warehouseId ?? "");
  const [note, setNote] = useState(po.note ?? "");
  const [lines, setLines] = useState<DraftLine[]>(
    po.lines.map((l) => ({
      item: { id: l.catalogItemId, name: l.itemName ?? "Produk", externalCode: "" },
      qtyOrdered: String(l.qtyOrdered),
      unitCost: String(l.unitCost),
    })),
  );

  const setLine = (i: number, patch: Partial<DraftLine>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { item: null, qtyOrdered: "", unitCost: "" }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));
  const validLines = lines.filter((l) => l.item && Number(l.qtyOrdered) > 0);

  const mut = useMutation({
    mutationFn: () =>
      inventoryApi.updatePurchaseOrder(po.id, {
        supplierName: supplierName || undefined,
        warehouseId: warehouseId || undefined,
        note: note || undefined,
        lines: validLines.map((l) => ({
          catalogItemId: l.item!.id,
          warehouseId: warehouseId || undefined,
          qtyOrdered: Number(l.qtyOrdered),
          unitCost: Number(l.unitCost) || 0,
        })),
      }),
    onSuccess: () => { toast.success("PO diperbarui"); onSaved(); },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Supplier</Label><Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Gudang</Label><WarehouseSelect value={warehouseId} onChange={setWarehouseId} /></div>
      </div>
      <div className="space-y-1.5"><Label>Catatan</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_110px_130px_auto] sm:items-end">
            <div className="space-y-1.5">{i === 0 ? <Label>Produk</Label> : null}<ItemPicker value={l.item} onChange={(it) => setLine(i, { item: it })} /></div>
            <div className="space-y-1.5">{i === 0 ? <Label>Qty</Label> : null}<Input type="number" min="0" step="any" value={l.qtyOrdered} onChange={(e) => setLine(i, { qtyOrdered: e.target.value })} /></div>
            <div className="space-y-1.5">{i === 0 ? <Label>Harga/unit</Label> : null}<Input type="number" min="0" step="any" value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} /></div>
            <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={lines.length === 1} onClick={() => removeLine(i)}>Hapus</Button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" onClick={addLine}>+ Baris</Button>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>Batal</Button>
        <Button onClick={() => mut.mutate()} disabled={validLines.length === 0 || mut.isPending}>
          {mut.isPending ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </div>
  );
}
