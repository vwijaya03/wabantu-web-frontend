"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export default function InvoicesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const [order, setOrder] = useState<Order | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", "invoices"],
    queryFn: () => inventoryApi.listInvoices({ pageSize: 50 }),
  });
  const invoices = data?.invoices ?? [];

  const createMut = useMutation({
    mutationFn: () => inventoryApi.createInvoiceFromOrder(order!.id),
    onSuccess: (inv) => {
      toast.success(`Faktur ${inv.invoiceNo} dibuat`);
      setOrder(null);
      void qc.invalidateQueries({ queryKey: ["inventory", "invoices"] });
      setDetailId(inv.id);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <RequireTenantDashboard title="Faktur">
      <PageHeader title="Faktur Penjualan" description="Dokumen faktur dari pesanan, lengkap dengan HPP per baris." />

      {canManage ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>Buat Faktur dari Pesanan</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1"><OrderPicker value={order} onChange={setOrder} /></div>
            <Button onClick={() => createMut.mutate()} disabled={!order || createMut.isPending}>
              {createMut.isPending ? "Membuat..." : "Buat Faktur"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Daftar Faktur</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">No Faktur</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-right">Subtotal</th>
                  <th className="px-3 py-2 text-right">HPP</th>
                  <th className="px-3 py-2 text-left">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Memuat...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Belum ada faktur.</td></tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setDetailId(inv.id)}>
                      <td className="px-3 py-2 font-medium text-primary">{inv.invoiceNo}</td>
                      <td className="px-3 py-2"><Badge variant="secondary">{inv.status}</Badge></td>
                      <td className="px-3 py-2 text-right">{formatIDR(inv.subtotal)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{formatIDR(inv.totalCogs)}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{inv.transactionDate}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <InvoiceDetailDialog id={detailId} onClose={() => setDetailId(null)} />
    </RequireTenantDashboard>
  );
}

function InvoiceDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data: inv } = useQuery({
    queryKey: ["inventory", "invoice", id],
    queryFn: () => inventoryApi.getInvoice(id!),
    enabled: Boolean(id),
  });
  return (
    <Dialog open={Boolean(id)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{inv ? inv.invoiceNo : "Memuat..."}</DialogTitle></DialogHeader>
        {inv ? (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                  <tr><th className="px-3 py-2 text-left">Produk</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Harga</th><th className="px-3 py-2 text-right">HPP</th></tr>
                </thead>
                <tbody className="divide-y">
                  {inv.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{l.description}</td>
                      <td className="px-3 py-2 text-right">{formatStockQty(l.qty)}</td>
                      <td className="px-3 py-2 text-right">{formatIDR(l.unitPrice)}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{formatIDR(l.cogs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-6 text-sm">
              <span>Subtotal: <span className="font-semibold">{formatIDR(inv.subtotal)}</span></span>
              <span className="text-muted-foreground">Total HPP: {formatIDR(inv.totalCogs)}</span>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
