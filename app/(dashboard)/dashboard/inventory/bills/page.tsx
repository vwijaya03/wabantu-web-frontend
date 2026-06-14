"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { ItemPicker, type PickedItem } from "@/components/inventory/item-picker";
import { WarehouseSelect } from "@/components/inventory/warehouse-select";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { inventoryApi, formatIDR, formatStockQty } from "@/lib/api/inventory";
import { toApiError } from "@/lib/api/client";
import { toast } from "sonner";

type BillDraftLine = {
  item: PickedItem | null;
  qty: string;
  unitCost: string;
  batchNo: string;
  purchaseOrderLineId?: string;
};

export default function BillsPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "bills"],
    queryFn: () => inventoryApi.listBills({ pageSize: 50 }),
  });
  const bills = data?.bills ?? [];

  return (
    <RequireTenantDashboard title="Penerimaan Barang">
      <div className="flex items-center justify-between">
        <PageHeader title="Penerimaan Barang (Bill)" description="Terima barang dari supplier — menambah stok & HPP." />
        {canManage ? <Button onClick={() => setCreating((v) => !v)}>{creating ? "Tutup" : "Terima Barang"}</Button> : null}
      </div>

      {creating ? (
        <CreateBillPanel
          onDone={() => {
            setCreating(false);
            void qc.invalidateQueries({ queryKey: ["inventory", "bills"] });
            void qc.invalidateQueries({ queryKey: ["inventory", "stock"] });
            void qc.invalidateQueries({ queryKey: ["inventory", "purchase-orders"] });
          }}
        />
      ) : null}

      <Card className="mt-4">
        <CardHeader><CardTitle>Daftar Penerimaan</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">No Bill</th>
                  <th className="px-3 py-2 text-left">Supplier</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-left">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Memuat...</td></tr>
                ) : bills.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">Belum ada penerimaan.</td></tr>
                ) : (
                  bills.map((b) => (
                    <tr key={b.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setDetailId(b.id)}>
                      <td className="px-3 py-2 font-medium text-primary">{b.billNo}</td>
                      <td className="px-3 py-2">{b.supplierName || "-"}</td>
                      <td className="px-3 py-2 text-right">{formatIDR(b.subtotal)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{b.transactionDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <BillDetailDialog id={detailId} onClose={() => setDetailId(null)} />
    </RequireTenantDashboard>
  );
}

function CreateBillPanel({ onDone }: { onDone: () => void }) {
  const [poId, setPoId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [lines, setLines] = useState<BillDraftLine[]>([{ item: null, qty: "", unitCost: "", batchNo: "" }]);

  const { data: poData } = useQuery({
    queryKey: ["inventory", "purchase-orders", "open"],
    queryFn: () => inventoryApi.listPurchaseOrders({ pageSize: 50 }),
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

function BillDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: bill } = useQuery({
    queryKey: ["inventory", "bill", id],
    queryFn: () => inventoryApi.getBill(id!),
    enabled: Boolean(id),
  });
  return (
    <Dialog open={Boolean(id)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{bill ? `${bill.billNo} · ${bill.supplierName || "Tanpa supplier"}` : "Memuat..."}</DialogTitle></DialogHeader>
        {bill ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant={bill.status === "posted" ? "success" : "destructive"}>{bill.status === "posted" ? "Diterima" : "Dibatalkan"}</Badge>
              <span className="text-muted-foreground">{bill.transactionDate}</span>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left">Produk</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Harga</th><th className="px-3 py-2 text-left">Batch</th></tr>
                </thead>
                <tbody className="divide-y">
                  {bill.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2">{l.itemName}</td>
                      <td className="px-3 py-2 text-right">{formatStockQty(l.qty)}</td>
                      <td className="px-3 py-2 text-right">{formatIDR(l.unitCost)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{l.batchNo || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-right text-sm">Total: <span className="font-semibold">{formatIDR(bill.subtotal)}</span></p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
