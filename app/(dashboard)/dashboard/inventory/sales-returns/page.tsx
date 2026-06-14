"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { OrderPicker } from "@/components/inventory/order-picker";
import { useAuth } from "@/components/providers/auth-provider";
import { canPerformOwnerActions } from "@/lib/api/auth";
import { inventoryApi, formatIDR, formatStockQty } from "@/lib/api/inventory";
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

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "sales-returns"],
    queryFn: () => inventoryApi.listSalesReturns({ pageSize: 50 }),
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
      <PageHeader title="Retur Penjualan" description="Barang kembali dari pelanggan — stok masuk lagi dengan HPP asli." />

      {canManage ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>Buat Retur</CardTitle></CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Daftar Retur</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">No Retur</th>
                  <th className="px-3 py-2 text-right">Nilai HPP</th>
                  <th className="px-3 py-2 text-left">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Memuat...</td></tr>
                ) : returns.length === 0 ? (
                  <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">Belum ada retur.</td></tr>
                ) : (
                  returns.map((r) => (
                    <tr key={r.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setDetailId(r.id)}>
                      <td className="px-3 py-2 font-medium text-primary">{r.returnNo}</td>
                      <td className="px-3 py-2 text-right">{formatIDR(r.totalCost)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.transactionDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ReturnDetailDialog id={detailId} onClose={() => setDetailId(null)} />
    </RequireTenantDashboard>
  );
}

function ReturnDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: r } = useQuery({
    queryKey: ["inventory", "sales-return", id],
    queryFn: () => inventoryApi.getSalesReturn(id!),
    enabled: Boolean(id),
  });
  return (
    <Dialog open={Boolean(id)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{r ? r.returnNo : "Memuat..."}</DialogTitle></DialogHeader>
        {r ? (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left">Produk</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">HPP/unit</th></tr>
                </thead>
                <tbody className="divide-y">
                  {r.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{l.itemName || l.catalogItemId}</td>
                      <td className="px-3 py-2 text-right">{formatStockQty(l.qty)}</td>
                      <td className="px-3 py-2 text-right">{formatIDR(l.unitCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-right text-sm">Total HPP kembali: <span className="font-semibold">{formatIDR(r.totalCost)}</span></p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
