"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InventoryPageHeader } from "@/components/inventory/inventory-help";
import { InventoryDataTablePagination } from "@/components/inventory/data-table-pagination";
import { TransactionDocLink } from "@/components/inventory/transaction-doc-link";
import { InventoryOpenDetailSuspense } from "@/components/inventory/use-inventory-open-detail";
import { RequireTenantDashboard } from "@/components/dashboard/require-tenant-dashboard";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { OrderPicker } from "@/components/inventory/order-picker";
import { BulkInvoicePanel } from "@/components/inventory/bulk-invoice-panel";
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
import { useTenantKey } from "@/hooks/use-tenant-key";
import { invalidateTenantQueries, tenantQueryKey } from "@/lib/query/tenant-query-key";

export default function InvoicesPage() {
  const qc = useQueryClient();
  const tenantKey = useTenantKey();
  const { user } = useAuth();
  const canManage = canPerformOwnerActions(user);
  const [order, setOrder] = useState<Order | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [createMode, setCreateMode] = useState<"single" | "bulk">("single");

  const { data, isLoading } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "invoices", searchQ, page, pageSize),
    queryFn: ({ signal }) => inventoryApi.listInvoices({ q: searchQ || undefined, page, pageSize }, signal),
  });
  const invoices = data?.invoices ?? [];

  const createMut = useMutation({
    mutationFn: () => inventoryApi.createInvoiceFromOrder(order!.id),
    onSuccess: (inv) => {
      toast.success(`Faktur ${inv.invoiceNo} dibuat`);
      setOrder(null);
      invalidateTenantQueries(qc, tenantKey, "inventory", "invoices");
      setDetailId(inv.id);
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <RequireTenantDashboard title="Faktur">
      <InventoryPageHeader title="Faktur Penjualan" description="Dokumen faktur dari pesanan, lengkap dengan HPP per baris." helpTopic="invoices" />

      {canManage ? (
        <Card className="mb-4">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Buat Faktur</CardTitle>
            <InventoryFormModeSwitch mode={createMode} onChange={setCreateMode} />
          </CardHeader>
          <CardContent>
            {createMode === "single" ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1"><OrderPicker value={order} onChange={setOrder} /></div>
                <Button onClick={() => createMut.mutate()} disabled={!order || createMut.isPending}>
                  {createMut.isPending ? "Membuat..." : "Buat Faktur"}
                </Button>
              </div>
            ) : (
              <BulkInvoicePanel embedded />
            )}
          </CardContent>
        </Card>
      ) : null}

      <InventoryOpenDetailSuspense setDetailId={setDetailId} />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Daftar Faktur</CardTitle>
          <Input
            placeholder="Cari no faktur..."
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
                    <InventoryTableCell>
                      <TransactionDocLink docNo={inv.invoiceNo} onClick={() => setDetailId(inv.id)} />
                    </InventoryTableCell>
                    <InventoryTableCell><Badge variant="secondary">{inv.status}</Badge></InventoryTableCell>
                    <InventoryTableCell align="right">{formatIDR(inv.subtotal)}</InventoryTableCell>
                    <InventoryTableCell align="right" className="text-muted-foreground">{formatIDR(inv.totalCogs)}</InventoryTableCell>
                    <InventoryTableCell className="text-xs text-muted-foreground">{inv.transactionDate}</InventoryTableCell>
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

      <InvoiceDetailDialog id={detailId} canManage={canManage} onClose={() => setDetailId(null)} />
    </RequireTenantDashboard>
  );
}

function InvoiceDetailDialog({ id, canManage, onClose }: { id: string | null; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const tenantKey = useTenantKey();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const { data: inv } = useQuery({
    queryKey: tenantQueryKey(tenantKey, "inventory", "invoice", id),
    queryFn: ({ signal }) => inventoryApi.getInvoice(id!, signal),
    enabled: Boolean(id),
  });
  const delMut = useMutation({
    mutationFn: () => inventoryApi.deleteInvoice(id!),
    onSuccess: () => {
      toast.success("Faktur dihapus");
      onClose();
      invalidateTenantQueries(qc, tenantKey, "inventory", "invoices");
    },
    onError: (e) => toast.error(toApiError(e).message),
  });
  return (
    <>
    <Dialog open={Boolean(id)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{inv ? inv.invoiceNo : "Memuat..."}</DialogTitle>
          <DialogDescription className="sr-only">Detail faktur penjualan</DialogDescription>
        </DialogHeader>
        {inv ? (
          <div className="space-y-3">
            {canManage ? (
              <div className="flex justify-end">
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

    <ConfirmDialog
      open={deleteConfirmOpen}
      onOpenChange={setDeleteConfirmOpen}
      title="Hapus faktur?"
      description={inv ? `Faktur ${inv.invoiceNo} akan dihapus permanen.` : undefined}
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
