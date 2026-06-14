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
          <InventoryTable>
            <InventoryTableHeader>
              <InventoryTableRow>
                <InventoryTableHead>No Faktur</InventoryTableHead>
                <InventoryTableHead>Status</InventoryTableHead>
                <InventoryTableHead align="right">Subtotal</InventoryTableHead>
                <InventoryTableHead align="right">HPP</InventoryTableHead>
                <InventoryTableHead>Tanggal</InventoryTableHead>
              </InventoryTableRow>
            </InventoryTableHeader>
            <InventoryTableBody>
              {isLoading ? (
                <InventoryTableEmpty colSpan={5}>Memuat...</InventoryTableEmpty>
              ) : invoices.length === 0 ? (
                <InventoryTableEmpty colSpan={5}>Belum ada faktur.</InventoryTableEmpty>
              ) : (
                invoices.map((inv) => (
                  <InventoryTableRow key={inv.id} className="cursor-pointer" onClick={() => setDetailId(inv.id)}>
                    <InventoryTableCell className="font-medium text-primary">{inv.invoiceNo}</InventoryTableCell>
                    <InventoryTableCell><Badge variant="secondary">{inv.status}</Badge></InventoryTableCell>
                    <InventoryTableCell align="right">{formatIDR(inv.subtotal)}</InventoryTableCell>
                    <InventoryTableCell align="right" className="text-muted-foreground">{formatIDR(inv.totalCogs)}</InventoryTableCell>
                    <InventoryTableCell className="text-xs text-muted-foreground">{inv.transactionDate}</InventoryTableCell>
                  </InventoryTableRow>
                ))
              )}
            </InventoryTableBody>
          </InventoryTable>
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
            <InventoryTable>
              <InventoryTableHeader>
                <InventoryTableRow>
                  <InventoryTableHead>Produk</InventoryTableHead>
                  <InventoryTableHead align="right">Qty</InventoryTableHead>
                  <InventoryTableHead align="right">Harga</InventoryTableHead>
                  <InventoryTableHead align="right">HPP</InventoryTableHead>
                </InventoryTableRow>
              </InventoryTableHeader>
              <InventoryTableBody>
                {inv.lines.map((l, i) => (
                  <InventoryTableRow key={i}>
                    <InventoryTableCell>{l.description}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatStockQty(l.qty)}</InventoryTableCell>
                    <InventoryTableCell align="right">{formatIDR(l.unitPrice)}</InventoryTableCell>
                    <InventoryTableCell align="right" className="text-muted-foreground">{formatIDR(l.cogs)}</InventoryTableCell>
                  </InventoryTableRow>
                ))}
              </InventoryTableBody>
            </InventoryTable>
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
