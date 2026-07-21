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
import { Pencil, Trash2 } from "lucide-react";
import { useTenantKey } from "@/hooks/use-tenant-key";
import { invalidateTenantQueries, tenantQueryKey } from "@/lib/query/tenant-query-key";

type BillDraftLine = {
  item: PickedItem | null;
  qty: string;
  unitCost: string;
  batchNo: string;
  purchaseOrderLineId?: string;
};

export default function BillsPage() {
  const qc = useQueryClient();
  const tenantKey = useTenantKey();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editOnOpen, setEditOnOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [deleteBillId, setDeleteBillId] = useState<string | null>(null);
  const [deleteBillNo, setDeleteBillNo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "bills", searchQ, page, pageSize),
    queryFn: ({ signal }) => inventoryApi.listBills({ q: searchQ || undefined, page, pageSize }, signal),
  });
  const bills = data?.bills ?? [];

  const deleteBillMut = useMutation({
    mutationFn: (id: string) => inventoryApi.deleteBill(id),
    onSuccess: () => {
      toast.success("Penerimaan dihapus — stok dikurangi");
      invalidateTenantQueries(qc, tenantKey, "inventory");
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <RequireTenantDashboard title="Penerimaan Barang">
      <div className="flex items-center justify-between">
        <InventoryPageHeader title="Penerimaan Barang (Bill)" description="Terima barang dari supplier — menambah stok & HPP." helpTopic="bills" />
        {canManage ? <Button onClick={() => setCreating((v) => !v)}>{creating ? "Tutup" : "Terima Barang"}</Button> : null}
      </div>

      {creating ? (
        <CreateBillPanel
          onDone={() => {
            setCreating(false);
            invalidateTenantQueries(qc, tenantKey, "inventory", "bills");
            invalidateTenantQueries(qc, tenantKey, "inventory", "stock");
            invalidateTenantQueries(qc, tenantKey, "inventory", "purchase-orders");
          }}
        />
      ) : null}

      <InventoryOpenDetailSuspense setDetailId={setDetailId} />

      <Card className="mt-4">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Daftar Penerimaan</CardTitle>
          <Input
            placeholder="Cari no bill..."
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
                <InventoryTableHead>No Bill</InventoryTableHead>
                <InventoryTableHead>Supplier</InventoryTableHead>
                <InventoryTableHead align="right">Total</InventoryTableHead>
                <InventoryTableHead>Tanggal</InventoryTableHead>
                {canManage ? <InventoryTableHead align="right">Aksi</InventoryTableHead> : null}
              </InventoryTableRow>
            </InventoryTableHeader>
            <InventoryTableBody>
              {isLoading ? (
                <InventoryTableEmpty colSpan={canManage ? 5 : 4}>Memuat...</InventoryTableEmpty>
              ) : bills.length === 0 ? (
                <InventoryTableEmpty colSpan={canManage ? 5 : 4}>Belum ada penerimaan.</InventoryTableEmpty>
              ) : (
                bills.map((b) => (
                  <InventoryTableRow key={b.id} className="cursor-pointer" onClick={() => { setEditOnOpen(false); setDetailId(b.id); }}>
                    <InventoryTableCell>
                      <TransactionDocLink docNo={b.billNo} onClick={() => { setEditOnOpen(false); setDetailId(b.id); }} />
                    </InventoryTableCell>
                    <InventoryTableCell>{b.supplierName || "-"}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatIDR(b.subtotal)}</InventoryTableCell>
                    <InventoryTableCell className="text-xs text-muted-foreground">{b.transactionDate}</InventoryTableCell>
                    {canManage ? (
                      <InventoryTableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Edit ${b.billNo}`}
                            onClick={() => { setEditOnOpen(true); setDetailId(b.id); }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            aria-label={`Hapus ${b.billNo}`}
                            disabled={deleteBillMut.isPending}
                            onClick={() => {
                              setDeleteBillId(b.id);
                              setDeleteBillNo(b.billNo);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </InventoryTableCell>
                    ) : null}
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

      <BillDetailDialog id={detailId} initialEditing={editOnOpen} onClose={() => { setEditOnOpen(false); setDetailId(null); }} />

      <ConfirmDialog
        open={!!deleteBillId}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteBillId(null);
            setDeleteBillNo("");
          }
        }}
        title="Hapus penerimaan barang?"
        description={deleteBillNo ? `${deleteBillNo} akan dihapus. Stok akan dikurangi.` : undefined}
        confirmLabel="Hapus"
        destructive
        loading={deleteBillMut.isPending}
        onConfirm={() => {
          if (deleteBillId) deleteBillMut.mutate(deleteBillId);
          setDeleteBillId(null);
          setDeleteBillNo("");
        }}
      />
    </RequireTenantDashboard>
  );
}

function CreateBillPanel({ onDone }: { onDone: () => void }) {
  const tenantKey = useTenantKey();
  const [poId, setPoId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [lines, setLines] = useState<BillDraftLine[]>([{ item: null, qty: "", unitCost: "", batchNo: "" }]);

  const { data: poData } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "purchase-orders", "open"),
    queryFn: ({ signal }) => inventoryApi.listPurchaseOrders({ pageSize: 50 }, signal),
  });
  const openPOs = (poData?.purchaseOrders ?? []).filter((p) => p.status === "open" || p.status === "partial");

  const setLine = (i: number, patch: Partial<BillDraftLine>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { item: null, qty: "", unitCost: "", batchNo: "" }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));

  const prefillFromPO = useMutation({
    mutationFn: (id: string) => inventoryApi.getPurchaseOrder(id),
    onSuccess: (po) => {
      setSupplierName(po.supplierName ?? "");
      setWarehouseId(po.warehouseId ?? "");
      const remaining = po.lines
        .filter((l) => (l.qtyOrdered - (l.qtyReceived ?? 0)) > 0)
        .map((l) => ({
          item: { id: l.catalogItemId, name: l.itemName ?? "Produk", externalCode: "" },
          qty: String(l.qtyOrdered - (l.qtyReceived ?? 0)),
          unitCost: String(l.unitCost),
          batchNo: "",
          purchaseOrderLineId: l.id,
        }));
      setLines(remaining.length > 0 ? remaining : [{ item: null, qty: "", unitCost: "", batchNo: "" }]);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitCost) || 0), 0);
  const validLines = lines.filter((l) => l.item && Number(l.qty) > 0);

  const mut = useMutation({
    mutationFn: () =>
      inventoryApi.createBill({
        purchaseOrderId: poId || undefined,
        supplierName: supplierName || undefined,
        warehouseId: warehouseId || undefined,
        lines: validLines.map((l) => ({
          catalogItemId: l.item!.id,
          warehouseId: warehouseId || undefined,
          purchaseOrderLineId: l.purchaseOrderLineId,
          qty: Number(l.qty),
          unitCost: Number(l.unitCost) || 0,
          batchNo: l.batchNo || undefined,
        })),
      }),
    onSuccess: () => { toast.success("Barang diterima — stok bertambah"); onDone(); },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <Card className="mt-4 border-primary/30">
      <CardHeader><CardTitle>Terima Barang</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Dari PO (opsional)</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={poId}
              onChange={(e) => {
                setPoId(e.target.value);
                if (e.target.value) prefillFromPO.mutate(e.target.value);
              }}
            >
              <option value="">Tanpa PO</option>
              {openPOs.map((p) => (
                <option key={p.id} value={p.id}>{p.poNo} · {p.supplierName || "tanpa supplier"}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5"><Label>Supplier</Label><Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Gudang</Label><WarehouseSelect value={warehouseId} onChange={setWarehouseId} /></div>
        </div>

        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_100px_120px_120px_auto] sm:items-end">
              <div className="space-y-1.5">{i === 0 ? <Label>Produk</Label> : null}<ItemPicker value={l.item} onChange={(it) => setLine(i, { item: it })} /></div>
              <div className="space-y-1.5">{i === 0 ? <Label>Qty</Label> : null}<Input type="number" min="0" step="any" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} /></div>
              <div className="space-y-1.5">{i === 0 ? <Label>Harga/unit</Label> : null}<Input type="number" min="0" step="any" value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} /></div>
              <div className="space-y-1.5">{i === 0 ? <Label>Batch (opsional)</Label> : null}<Input value={l.batchNo} onChange={(e) => setLine(i, { batchNo: e.target.value })} /></div>
              <Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={lines.length === 1} onClick={() => removeLine(i)}>Hapus</Button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" onClick={addLine}>+ Baris</Button>
          <p className="text-sm">Total: <span className="font-semibold">{formatIDR(total)}</span></p>
        </div>
        <Button onClick={() => mut.mutate()} disabled={validLines.length === 0 || mut.isPending}>
          {mut.isPending ? "Memproses..." : "Terima & Tambah Stok"}
        </Button>
      </CardContent>
    </Card>
  );
}

function BillDetailDialog({ id, initialEditing, onClose }: { id: string | null; initialEditing?: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const tenantKey = useTenantKey();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const [editing, setEditing] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { data: bill } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "bill", id),
    queryFn: ({ signal }) => inventoryApi.getBill(id!, signal),
    enabled: Boolean(id),
  });
  const delMut = useMutation({
    mutationFn: () => inventoryApi.deleteBill(id!),
    onSuccess: () => {
      toast.success("Penerimaan dihapus — stok dikurangi");
      onClose();
      invalidateTenantQueries(qc, tenantKey, "inventory");
    },
    onError: (e) => toast.error(toApiError(e).message),
  });
  return (
    <>
    <Dialog open={Boolean(id)} onOpenChange={(o) => { if (!o) { setEditing(false); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bill ? `${bill.billNo} · ${bill.supplierName || "Tanpa supplier"}` : "Memuat..."}</DialogTitle>
          <DialogDescription className="sr-only">Detail tagihan pembelian</DialogDescription>
        </DialogHeader>
        {bill ? (
          (editing || initialEditing) ? (
            <BillEditForm
              bill={bill}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                void qc.invalidateQueries({ queryKey: ["inventory", "bill", id] });
                invalidateTenantQueries(qc, tenantKey, "inventory", "bills");
                invalidateTenantQueries(qc, tenantKey, "inventory", "stock");
              }}
            />
          ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={bill.status === "posted" ? "success" : "destructive"}>{bill.status === "posted" ? "Diterima" : "Dibatalkan"}</Badge>
                <span className="text-muted-foreground">{bill.transactionDate}</span>
              </div>
              {canManage ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={delMut.isPending}
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    Hapus
                  </Button>
                </div>
              ) : null}
            </div>
            <InventoryTable>
              <InventoryTableHeader>
                <InventoryTableRow>
                  <InventoryTableHead>Produk</InventoryTableHead>
                  <InventoryTableHead align="right">Qty</InventoryTableHead>
                  <InventoryTableHead align="right">Harga</InventoryTableHead>
                  <InventoryTableHead>Batch</InventoryTableHead>
                </InventoryTableRow>
              </InventoryTableHeader>
              <InventoryTableBody>
                {bill.lines.map((l) => (
                  <InventoryTableRow key={l.id}>
                    <InventoryTableCell>{l.itemName}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatStockQty(l.qty)}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatIDR(l.unitCost)}</InventoryTableCell>
                    <InventoryTableCell className="text-xs text-muted-foreground">{l.batchNo || "-"}</InventoryTableCell>
                  </InventoryTableRow>
                ))}
              </InventoryTableBody>
            </InventoryTable>
            <p className="text-right text-sm">Total: <span className="font-semibold">{formatIDR(bill.subtotal)}</span></p>
          </div>
          )
        ) : null}
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      open={deleteConfirmOpen}
      onOpenChange={setDeleteConfirmOpen}
      title="Hapus penerimaan barang?"
      description={bill ? `${bill.billNo} akan dihapus. Stok akan dikurangi.` : undefined}
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

function BillEditForm({
  bill,
  onCancel,
  onSaved,
}: {
  bill: import("@/lib/api/inventory").Bill;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [supplierName, setSupplierName] = useState(bill.supplierName ?? "");
  const [note, setNote] = useState(bill.note ?? "");
  const [lines, setLines] = useState<BillDraftLine[]>(
    bill.lines.map((l) => ({
      item: { id: l.catalogItemId, name: l.itemName ?? "Produk", externalCode: "" },
      qty: String(l.qty),
      unitCost: String(l.unitCost),
      batchNo: l.batchNo ?? "",
    })),
  );

  const setLine = (i: number, patch: Partial<BillDraftLine>) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, { item: null, qty: "", unitCost: "", batchNo: "" }]);
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, idx) => idx !== i));
  const validLines = lines.filter((l) => l.item && Number(l.qty) > 0);

  const mut = useMutation({
    mutationFn: () =>
      inventoryApi.updateBill(bill.id, {
        supplierName: supplierName || undefined,
        note: note || undefined,
        lines: validLines.map((l) => ({
          catalogItemId: l.item!.id,
          qty: Number(l.qty),
          unitCost: Number(l.unitCost) || 0,
          batchNo: l.batchNo || undefined,
        })),
      }),
    onSuccess: () => { toast.success("Penerimaan diperbarui — stok disesuaikan"); onSaved(); },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Nomor bill tetap: <span className="font-mono font-medium">{bill.billNo}</span></p>
      <div className="space-y-1.5"><Label>Supplier</Label><Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /></div>
      <div className="space-y-1.5"><Label>Catatan</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_100px_120px_120px_auto] sm:items-end">
            <div className="space-y-1.5">{i === 0 ? <Label>Produk</Label> : null}<ItemPicker value={l.item} onChange={(it) => setLine(i, { item: it })} /></div>
            <div className="space-y-1.5">{i === 0 ? <Label>Qty</Label> : null}<Input type="number" min="0" step="any" value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} /></div>
            <div className="space-y-1.5">{i === 0 ? <Label>Harga/unit</Label> : null}<Input type="number" min="0" step="any" value={l.unitCost} onChange={(e) => setLine(i, { unitCost: e.target.value })} /></div>
            <div className="space-y-1.5">{i === 0 ? <Label>Batch</Label> : null}<Input value={l.batchNo} onChange={(e) => setLine(i, { batchNo: e.target.value })} /></div>
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
