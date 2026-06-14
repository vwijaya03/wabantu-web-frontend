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
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "purchase-orders"],
    queryFn: () => inventoryApi.listPurchaseOrders({ pageSize: 50 }),
  });
  const orders = data?.purchaseOrders ?? [];

  return (
    <RequireTenantDashboard title="Purchase Order">
      <div className="flex items-center justify-between">
        <PageHeader title="Purchase Order" description="Rencana pembelian ke supplier. Stok masuk saat Penerimaan (Bill)." />
        {canManage ? <Button onClick={() => setCreating((v) => !v)}>{creating ? "Tutup" : "Buat PO"}</Button> : null}
      </div>

      {creating ? <CreatePOPanel onDone={() => { setCreating(false); void qc.invalidateQueries({ queryKey: ["inventory", "purchase-orders"] }); }} /> : null}

      <Card className="mt-4">
        <CardHeader><CardTitle>Daftar PO</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">No PO</th>
                  <th className="px-3 py-2 text-left">Supplier</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2 text-left">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Memuat...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Belum ada PO.</td></tr>
                ) : (
                  orders.map((po) => (
                    <tr key={po.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setDetailId(po.id)}>
                      <td className="px-3 py-2 font-medium text-primary">{po.poNo}</td>
                      <td className="px-3 py-2">{po.supplierName || "-"}</td>
                      <td className="px-3 py-2">{poStatusBadge(po.status)}</td>
                      <td className="px-3 py-2 text-right">{formatIDR(po.subtotal)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{po.transactionDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
  const { data: po } = useQuery({
    queryKey: ["inventory", "purchase-order", id],
    queryFn: () => inventoryApi.getPurchaseOrder(id!),
    enabled: Boolean(id),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["inventory", "purchase-orders"] });
    void qc.invalidateQueries({ queryKey: ["inventory", "purchase-order", id] });
  };
  const closeMut = useMutation({ mutationFn: () => inventoryApi.closePurchaseOrder(id!), onSuccess: () => { toast.success("PO ditutup"); refresh(); }, onError: (e) => toast.error(toApiError(e).message) });
  const cancelMut = useMutation({ mutationFn: () => inventoryApi.cancelPurchaseOrder(id!), onSuccess: () => { toast.success("PO dibatalkan"); refresh(); }, onError: (e) => toast.error(toApiError(e).message) });

  return (
    <Dialog open={Boolean(id)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{po ? `${po.poNo} · ${po.supplierName || "Tanpa supplier"}` : "Memuat..."}</DialogTitle></DialogHeader>
        {po ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">{poStatusBadge(po.status)}<span className="text-muted-foreground">{po.transactionDate}</span></div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left">Produk</th><th className="px-3 py-2 text-right">Dipesan</th><th className="px-3 py-2 text-right">Diterima</th><th className="px-3 py-2 text-right">Harga</th></tr>
                </thead>
                <tbody className="divide-y">
                  {po.lines.map((l) => (
                    <tr key={l.id}>
                      <td className="px-3 py-2">{l.itemName}</td>
                      <td className="px-3 py-2 text-right">{formatStockQty(l.qtyOrdered)}</td>
                      <td className="px-3 py-2 text-right">{formatStockQty(l.qtyReceived ?? 0)}</td>
                      <td className="px-3 py-2 text-right">{formatIDR(l.unitCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-right text-sm">Total: <span className="font-semibold">{formatIDR(po.subtotal)}</span></p>
            {canManage && (po.status === "open" || po.status === "partial") ? (
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending}>Batalkan</Button>
                <Button variant="outline" size="sm" onClick={() => closeMut.mutate()} disabled={closeMut.isPending}>Tutup PO</Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
